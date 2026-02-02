import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import prisma from "../db.server";

// Generate a unique discount code
function generateDiscountCode(prefix: string = "POPUP"): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
}

// GraphQL mutation to create customer with email marketing consent
const CUSTOMER_CREATE_MUTATION = `
  mutation customerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        emailMarketingConsent {
          marketingState
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CUSTOMER_SEARCH_QUERY = `
  query customerSearch($query: String!) {
    customers(first: 1, query: $query) {
      edges {
        node {
          id
          email
        }
      }
    }
  }
`;

const CUSTOMER_UPDATE_MUTATION = `
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
    // Handle OPTIONS for CORS preflight
    if (request.method === "OPTIONS") {
        return json(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, {
            status: 405,
            headers: { "Access-Control-Allow-Origin": "*" },
        });
    }

    try {
        const body = await request.json();
        const { shop, campaignId, email, phone } = body;

        console.log("[Subscribe] Received request:", { shop, campaignId, email, phone });

        if (!shop || !campaignId) {
            return json({ error: "Missing required fields" }, {
                status: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
            });
        }

        // Get campaign
        const campaign = await prisma.campaign.findFirst({
            where: { id: campaignId, shop },
        });

        if (!campaign) {
            console.log("[Subscribe] Campaign not found:", campaignId);
            return json({ error: "Campaign not found" }, {
                status: 404,
                headers: { "Access-Control-Allow-Origin": "*" },
            });
        }

        // Generate discount code if needed
        let discountCode: string | null = null;

        if (campaign.discountType === "existing") {
            discountCode = campaign.discountCode;
        } else if (campaign.discountType === "auto") {
            discountCode = generateDiscountCode();
        }

        // Use unauthenticated.admin to get admin client for the shop
        // This uses the offline access token stored in the session
        try {
            console.log("[Subscribe] Getting admin client for shop:", shop);
            const { admin } = await unauthenticated.admin(shop);

            // Check if customer already exists
            console.log("[Subscribe] Searching for existing customer:", email);
            const searchResult = await admin.graphql(CUSTOMER_SEARCH_QUERY, {
                variables: {
                    query: `email:${email}`,
                },
            });

            const searchData = await searchResult.json();
            console.log("[Subscribe] Search result:", JSON.stringify(searchData));
            const existingCustomer = searchData.data?.customers?.edges?.[0]?.node;

            if (existingCustomer) {
                console.log("[Subscribe] Customer exists, updating:", existingCustomer.id);
                // Customer exists - update their email marketing consent
                const updateResult = await admin.graphql(CUSTOMER_UPDATE_MUTATION, {
                    variables: {
                        input: {
                            id: existingCustomer.id,
                            emailMarketingConsent: {
                                marketingState: "SUBSCRIBED",
                                marketingOptInLevel: "SINGLE_OPT_IN",
                                consentUpdatedAt: new Date().toISOString(),
                            },
                            ...(phone && { phone }),
                        },
                    },
                });
                const updateData = await updateResult.json();
                console.log("[Subscribe] Update result:", JSON.stringify(updateData));

                // Return existing code if duplicate
                if (campaign.preventDuplicates) {
                    return json({
                        success: true,
                        duplicate: true,
                        discountCode: discountCode || campaign.discountCode,
                    }, {
                        headers: { "Access-Control-Allow-Origin": "*" },
                    });
                }
            } else {
                console.log("[Subscribe] Creating new customer");
                // Create new customer with subscribed status
                const createResult = await admin.graphql(CUSTOMER_CREATE_MUTATION, {
                    variables: {
                        input: {
                            email,
                            ...(phone && { phone }),
                            emailMarketingConsent: {
                                marketingState: "SUBSCRIBED",
                                marketingOptInLevel: "SINGLE_OPT_IN",
                                consentUpdatedAt: new Date().toISOString(),
                            },
                            tags: [`popup-${campaignId}`, "popup-subscriber"],
                        },
                    },
                });

                const createData = await createResult.json();
                console.log("[Subscribe] Create result:", JSON.stringify(createData));

                if (createData.data?.customerCreate?.userErrors?.length > 0) {
                    console.error("[Subscribe] Customer create errors:", createData.data.customerCreate.userErrors);
                } else {
                    console.log("[Subscribe] Customer created successfully:", createData.data?.customerCreate?.customer);
                }
            }
        } catch (adminError) {
            console.error("[Subscribe] Admin API error:", adminError);
            // Continue to save locally even if Shopify API fails
        }

        // Also store in local DB for stats tracking
        try {
            await prisma.subscriber.create({
                data: {
                    shop,
                    campaignId,
                    email: email || null,
                    phone: phone || null,
                    discountCode,
                },
            });
            console.log("[Subscribe] Saved to local DB");
        } catch (dbError) {
            console.log("[Subscribe] Subscriber may already exist:", dbError);
        }

        // Increment conversion count
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { conversions: { increment: 1 } },
        });

        return json({
            success: true,
            discountCode,
        }, {
            headers: { "Access-Control-Allow-Origin": "*" },
        });
    } catch (error) {
        console.error("[Subscribe] Error:", error);
        return json({ error: "Internal server error" }, {
            status: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
        });
    }
};

// Handle OPTIONS for CORS preflight
export const loader = async ({ request }: LoaderFunctionArgs) => {
    return json(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
};
