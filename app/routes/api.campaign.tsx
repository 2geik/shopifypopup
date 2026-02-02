import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";

// Public endpoint to get active campaign config for a shop
export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const campaignId = url.searchParams.get("campaignId");

    if (!shop) {
        return json({ error: "Shop parameter required" }, {
            status: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        });
    }

    let campaign;

    try {
        if (campaignId) {
            // Get specific campaign
            campaign = await (prisma as any).campaign.findFirst({
                where: { id: campaignId, shop, status: "ACTIVE" },
            });
        } else {
            // Get first active campaign
            campaign = await (prisma as any).campaign.findFirst({
                where: { shop, status: "ACTIVE" },
                orderBy: { createdAt: "desc" },
            });
        }
    } catch (error) {
        console.error("Database error:", error);
        return json({ error: "Database error" }, {
            status: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        });
    }

    if (!campaign) {
        return json({ error: "No active campaign found" }, {
            status: 404,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        });
    }

    // Increment view count
    try {
        await (prisma as any).campaign.update({
            where: { id: campaign.id },
            data: { views: { increment: 1 } },
        });
    } catch (error) {
        console.error("Failed to increment views:", error);
    }

    // Return campaign config for the frontend

    return json({
        id: campaign.id,
        triggerDelay: campaign.triggerDelay,
        triggerPages: campaign.triggerPages,
        triggerUrlParam: campaign.triggerUrlParam,
        showToMembers: campaign.showToMembers,
        preventDuplicates: campaign.preventDuplicates,
        redisplayAfterDays: campaign.redisplayAfterDays,
        images: {
            desktop: campaign.desktopImage,
            mobile: campaign.mobileImage,
        },
        imagePosition: campaign.imagePosition,
        mobileImagePosition: campaign.mobileImagePosition,
        hideImageOnMobile: campaign.hideImageOnMobile,
        imageRatio: campaign.imageRatio,
        steps: {
            welcome: {
                title: campaign.welcomeTitle,
                subtitle: campaign.welcomeSubtitle,
                btnText: campaign.welcomeButtonText,
            },
            form: {
                title: campaign.formTitle,
                subtitle: campaign.formSubtitle,
                fields: [
                    campaign.showEmailField && {
                        type: "email",
                        name: "email",
                        placeholder: campaign.emailPlaceholder,
                        required: campaign.emailRequired,
                    },
                    campaign.showPhoneField && {
                        type: "tel",
                        name: "phone",
                        placeholder: campaign.phonePlaceholder,
                        required: campaign.phoneRequired,
                    },
                ].filter(Boolean),
                btnText: campaign.formButtonText,
            },
            success: {
                title: campaign.successTitle,
                subtitle: campaign.successSubtitle,
                code: campaign.discountCode || "",
                btns: [
                    {
                        text: (campaign as any).successBtn1Text || "CONTINUE",
                        link: (campaign as any).successBtn1Link || ""
                    },
                    {
                        text: (campaign as any).successBtn2Text || "",
                        link: (campaign as any).successBtn2Link || ""
                    }
                ],
            },
        },
        discountType: campaign.discountType,
        styles: {
            backgroundColor: campaign.backgroundColor,
            textColor: campaign.textColor,
            buttonTextColor: (campaign as any).buttonTextColor || "#ffffff",
            accentColor: campaign.accentColor,
            overlayColor: campaign.overlayColor,
            borderRadius: campaign.borderRadius,
            buttonStyle: campaign.buttonStyle,
            closeButtonStyle: campaign.closeButtonStyle,
            noThanksText: (campaign as any).noThanksText || "No thanks",
            fontFamily: campaign.fontFamily,
            titleFontSize: (campaign as any).titleFontSize || 40,
            subtitleFontSize: (campaign as any).subtitleFontSize || 18,
            buttonFontSize: (campaign as any).buttonFontSize || 16,
            titleFontSizeMobile: (campaign as any).titleFontSizeMobile || 24,
            subtitleFontSizeMobile: (campaign as any).subtitleFontSizeMobile || 14,
            buttonFontSizeMobile: (campaign as any).buttonFontSizeMobile || 14,
            inputBorderColor: (campaign as any).inputBorderColor || "#cccccc",
        },
    }, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60",
        },
    });
};
