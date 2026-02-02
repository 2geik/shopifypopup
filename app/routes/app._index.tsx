import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Badge,
  Box,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Fetch campaigns from database
  const campaigns = await prisma.campaign.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      views: true,
      conversions: true,
    },
  });

  // Calculate totals
  const stats = campaigns.reduce(
    (acc, c) => ({
      totalViews: acc.totalViews + c.views,
      totalConversions: acc.totalConversions + c.conversions,
    }),
    { totalViews: 0, totalConversions: 0 }
  );

  const averageRate = stats.totalViews > 0
    ? ((stats.totalConversions / stats.totalViews) * 100).toFixed(1) + "%"
    : "0%";

  return json({
    campaigns: campaigns.map((c) => ({
      ...c,
      conversionRate: c.views > 0 ? ((c.conversions / c.views) * 100).toFixed(1) + "%" : "0%",
    })),
    stats: {
      ...stats,
      averageRate,
    },
  });
};

export default function Index() {
  const { campaigns, stats } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Popup Mail" />
      <BlockStack gap="600">
        {/* Stats Section */}
        <InlineStack gap="400" wrap={false}>
          <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="300" borderWidth="025" borderColor="border">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Total Views</Text>
              <Text as="p" variant="headingLg">{stats.totalViews.toLocaleString()}</Text>
            </BlockStack>
          </Box>
          <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="300" borderWidth="025" borderColor="border">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Conversions</Text>
              <Text as="p" variant="headingLg">{stats.totalConversions.toLocaleString()}</Text>
            </BlockStack>
          </Box>
          <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="300" borderWidth="025" borderColor="border">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Conversion Rate</Text>
              <Text as="p" variant="headingLg">{stats.averageRate}</Text>
            </BlockStack>
          </Box>
        </InlineStack>

        {/* Campaigns Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Campaigns</Text>
                  <Button variant="primary" url="/app/campaigns/new">
                    Create Campaign
                  </Button>
                </InlineStack>

                {campaigns.length === 0 ? (
                  <EmptyState
                    heading="Create your first popup campaign"
                    action={{ content: "Create Campaign", url: "/app/campaigns/new" }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Engage your visitors with beautiful, customizable popups.</p>
                  </EmptyState>
                ) : (
                  <BlockStack gap="300">
                    {campaigns.map((campaign) => (
                      <Box
                        key={campaign.id}
                        padding="400"
                        background="bg-surface-secondary"
                        borderRadius="200"
                      >
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <InlineStack gap="200" blockAlign="center">
                              <Text as="h3" variant="headingMd" fontWeight="semibold">
                                {campaign.title}
                              </Text>
                              <Badge tone={campaign.status === "ACTIVE" ? "success" : campaign.status === "PAUSED" ? "warning" : "info"}>
                                {campaign.status}
                              </Badge>
                            </InlineStack>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {campaign.views} views • {campaign.conversions} conversions • {campaign.conversionRate} rate
                            </Text>
                          </BlockStack>
                          <Button url={`/app/campaigns/${campaign.id}`}>Edit</Button>
                        </InlineStack>
                      </Box>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">Quick Setup</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    To display popups on your store, enable the theme extension in your theme editor.
                  </Text>
                  <Button url="shopify://admin/themes/current/editor" external>
                    Open Theme Editor
                  </Button>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">Subscribers</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Subscribers are saved directly to your Shopify Customers with "Subscribed" email marketing status.
                  </Text>
                  <Button url="shopify://admin/customers" external>
                    View Customers
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
