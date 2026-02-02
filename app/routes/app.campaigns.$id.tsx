import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    TextField,
    Select,
    Button,
    InlineStack,
    Checkbox,
    RangeSlider,
    Divider,
    Box,
    Tabs,
    Banner,
    FormLayout,
    Modal,
    LegacyStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Generate URL param with memberspace prefix
function generateUrlParam(title: string): string {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 20);
    return `memberspace=${slug || "popup"}`;
}

const defaultCampaign = {
    id: null,
    title: "",
    status: "DRAFT",
    triggerDelay: 3,
    triggerPages: "all",
    triggerUrlParam: "",
    showToMembers: false,
    redisplayAfterDays: 7,
    preventDuplicates: true,
    desktopImage: "",
    mobileImage: "",
    imagePosition: "left",
    mobileImagePosition: "top",
    hideImageOnMobile: false,
    imageRatio: 40,
    welcomeTitle: "GET 10% OFF",
    welcomeSubtitle: "Sign up to our newsletter and unlock your exclusive discount.",
    welcomeButtonText: "CLAIM OFFER",
    formTitle: "UNLOCK YOUR DISCOUNT",
    formSubtitle: "Enter your details below.",
    showEmailField: true,
    emailRequired: true,
    emailPlaceholder: "Email Address",
    showPhoneField: false,
    phoneRequired: false,
    phonePlaceholder: "Phone Number",
    formButtonText: "SIGN UP",
    successTitle: "YOU'RE IN!",
    successSubtitle: "Here is your discount code:",
    successBtn1Text: "CONTINUE",
    successBtn1Link: "",
    successBtn2Text: "",
    successBtn2Link: "",
    discountType: "none",
    discountCode: "",
    discountValue: 10,
    backgroundColor: "#1a1a1a",
    textColor: "#ffffff",
    buttonTextColor: "#ffffff",
    accentColor: "#d4a017",
    overlayColor: "rgba(0,0,0,0.7)",
    borderRadius: 16,
    buttonStyle: "filled",
    noThanksText: "No thanks",
    fontFamily: "inherit",
    titleFontSize: 40,
    subtitleFontSize: 18,
    buttonFontSize: 16,
    titleFontSizeMobile: 24,
    subtitleFontSizeMobile: 14,
    buttonFontSizeMobile: 14,
    inputBorderColor: "#cccccc",
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const campaignId = params.id;

    if (campaignId === "new") {
        return json({ campaign: defaultCampaign, isNew: true });
    }

    const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, shop },
    });

    if (!campaign) {
        throw new Response("Campaign not found", { status: 404 });
    }

    return json({ campaign, isNew: false });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const intent = formData.get("intent");

    // Handle delete
    if (intent === "delete") {
        await prisma.campaign.delete({
            where: { id: params.id },
        });
        return redirect("/app");
    }

    // Handle image staging upload request
    if (intent === "getStagedUpload") {
        return null;
    }

    // Get title and auto-generate URL param if empty
    const title = formData.get("title") as string || "Untitled Campaign";
    let triggerUrlParam = formData.get("triggerUrlParam") as string;

    // Auto-generate URL param with memberspace prefix
    if (!triggerUrlParam) {
        triggerUrlParam = generateUrlParam(title);
    }

    // Parse form data
    const desktopImage = formData.get("desktopImage") as string;
    const mobileImage = formData.get("mobileImage") as string;

    console.log("[Campaign Save] Desktop image:", desktopImage);
    console.log("[Campaign Save] Mobile image:", mobileImage);

    const data = {
        shop,
        title,
        status: formData.get("status") as string || "DRAFT",
        triggerDelay: parseInt(formData.get("triggerDelay") as string) || 3,
        triggerPages: formData.get("triggerPages") as string || "all",
        triggerUrlParam,
        showToMembers: formData.get("showToMembers") === "true",
        redisplayAfterDays: parseInt(formData.get("redisplayAfterDays") as string) || 7,
        preventDuplicates: formData.get("preventDuplicates") === "true",
        desktopImage: desktopImage || null,
        mobileImage: mobileImage || null,
        imagePosition: formData.get("imagePosition") as string || "left",
        mobileImagePosition: formData.get("mobileImagePosition") as string || "top",
        hideImageOnMobile: formData.get("hideImageOnMobile") === "true",
        imageRatio: parseInt(formData.get("imageRatio") as string) || 40,
        welcomeTitle: formData.get("welcomeTitle") as string || "GET 10% OFF",
        welcomeSubtitle: formData.get("welcomeSubtitle") as string || "",
        welcomeButtonText: formData.get("welcomeButtonText") as string || "CLAIM OFFER",
        formTitle: formData.get("formTitle") as string || "UNLOCK YOUR DISCOUNT",
        formSubtitle: formData.get("formSubtitle") as string || "",
        showEmailField: formData.get("showEmailField") === "true",
        emailRequired: formData.get("emailRequired") === "true",
        emailPlaceholder: formData.get("emailPlaceholder") as string || "Email Address",
        showPhoneField: formData.get("showPhoneField") === "true",
        phoneRequired: formData.get("phoneRequired") === "true",
        phonePlaceholder: formData.get("phonePlaceholder") as string || "Phone Number",
        formButtonText: formData.get("formButtonText") as string || "SIGN UP",
        successTitle: formData.get("successTitle") as string || "YOU'RE IN!",
        successSubtitle: formData.get("successSubtitle") as string || "",
        successBtn1Text: formData.get("successBtn1Text") as string || "CONTINUE",
        successBtn1Link: formData.get("successBtn1Link") as string || "",
        successBtn2Text: formData.get("successBtn2Text") as string || "",
        successBtn2Link: formData.get("successBtn2Link") as string || "",
        discountType: formData.get("discountType") as string || "none",
        discountCode: formData.get("discountCode") as string || null,
        discountValue: parseInt(formData.get("discountValue") as string) || 10,
        backgroundColor: formData.get("backgroundColor") as string || "#1a1a1a",
        textColor: formData.get("textColor") as string || "#ffffff",
        buttonTextColor: formData.get("buttonTextColor") as string || "#ffffff",
        accentColor: formData.get("accentColor") as string || "#d4a017",
        overlayColor: formData.get("overlayColor") as string || "rgba(0,0,0,0.7)",
        borderRadius: parseInt(formData.get("borderRadius") as string) || 16,
        buttonStyle: formData.get("buttonStyle") as string || "filled",
        closeButtonStyle: formData.get("closeButtonStyle") as string || "circle",
        noThanksText: formData.get("noThanksText") as string || "No thanks",
        fontFamily: formData.get("fontFamily") as string || "inherit",
        titleFontSize: parseInt(formData.get("titleFontSize") as string) || 40,
        subtitleFontSize: parseInt(formData.get("subtitleFontSize") as string) || 18,
        buttonFontSize: parseInt(formData.get("buttonFontSize") as string) || 16,
        titleFontSizeMobile: parseInt(formData.get("titleFontSizeMobile") as string) || 24,
        subtitleFontSizeMobile: parseInt(formData.get("subtitleFontSizeMobile") as string) || 14,
        buttonFontSizeMobile: parseInt(formData.get("buttonFontSizeMobile") as string) || 14,
        inputBorderColor: formData.get("inputBorderColor") as string || "#cccccc",
    };

    if (params.id === "new") {
        await prisma.campaign.create({ data });
    } else {
        await prisma.campaign.update({
            where: { id: params.id },
            data,
        });
    }

    return redirect("/app");
};

export default function CampaignEditor() {
    const { campaign, isNew } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    const [selectedTab, setSelectedTab] = useState(0);
    const [formState, setFormState] = useState<any>(campaign);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const handleTabChange = useCallback((index: number) => setSelectedTab(index), []);

    const updateField = (field: string, value: any) => {
        setFormState((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        const formData = new FormData();
        Object.entries(formState).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, String(value));
            }
        });
        submit(formData, { method: "POST" });
    };

    const handleDelete = () => {
        const formData = new FormData();
        formData.append("intent", "delete");
        submit(formData, { method: "POST" });
    };



    // Note: Image URLs should be from Shopify Files or external CDN

    const tabs = [
        { id: "triggers", content: "Triggers" },
        { id: "content", content: "Content" },
        { id: "form", content: "Form Fields" },
        { id: "discount", content: "Discount" },
        { id: "styles", content: "Styles" },
    ];

    return (
        <Page
            backAction={{ content: "Campaigns", url: "/app" }}
            title={isNew ? "New Campaign" : formState.title || "Edit Campaign"}
            primaryAction={{
                content: "Save",
                onAction: handleSave,
                loading: isSubmitting,
            }}
            secondaryActions={!isNew ? [
                {
                    content: "Delete",
                    destructive: true,
                    onAction: () => setDeleteModalOpen(true),
                },
            ] : []}
        >
            <TitleBar title={isNew ? "New Campaign" : "Edit Campaign"} />

            <Modal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete campaign?"
                primaryAction={{
                    content: "Delete",
                    destructive: true,
                    onAction: handleDelete,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: () => setDeleteModalOpen(false),
                    },
                ]}
            >
                <Modal.Section>
                    <Text as="p">Are you sure you want to delete this campaign? This action cannot be undone.</Text>
                </Modal.Section>
            </Modal>

            <Layout>
                <Layout.Section>
                    <BlockStack gap="400">
                        {/* Campaign Name */}
                        <Card>
                            <BlockStack gap="300">
                                <TextField
                                    label="Campaign Name"
                                    value={formState.title}
                                    onChange={(v) => updateField("title", v)}
                                    autoComplete="off"
                                    helpText="Internal name for this campaign"
                                />
                                <Select
                                    label="Status"
                                    options={[
                                        { label: "Draft", value: "DRAFT" },
                                        { label: "Active", value: "ACTIVE" },
                                        { label: "Paused", value: "PAUSED" },
                                    ]}
                                    value={formState.status}
                                    onChange={(v) => updateField("status", v)}
                                />
                            </BlockStack>
                        </Card>

                        {/* Tabs */}
                        <Card padding="0">
                            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                                <Box padding="400">
                                    {/* TRIGGERS TAB */}
                                    {selectedTab === 0 && (
                                        <BlockStack gap="400">
                                            <Text as="h3" variant="headingMd">Display Triggers</Text>

                                            <TextField
                                                type="number"
                                                label="Delay (seconds)"
                                                value={String(formState.triggerDelay)}
                                                onChange={(v) => updateField("triggerDelay", parseInt(v) || 0)}
                                                autoComplete="off"
                                                helpText="How many seconds after page load to show the popup"
                                            />

                                            <Select
                                                label="Show on pages"
                                                options={[
                                                    { label: "All pages", value: "all" },
                                                    { label: "Homepage only", value: "homepage" },
                                                    { label: "Product pages", value: "products" },
                                                    { label: "Collection pages", value: "collections" },
                                                ]}
                                                value={formState.triggerPages}
                                                onChange={(v) => updateField("triggerPages", v)}
                                            />

                                            <TextField
                                                label="Trigger URL Parameter"
                                                value={formState.triggerUrlParam}
                                                onChange={(v) => updateField("triggerUrlParam", v)}
                                                autoComplete="off"
                                                helpText="Add this parameter to your URL to trigger the popup (e.g. ?promo=spring)"
                                                connectedRight={
                                                    <Button
                                                        onClick={() => {
                                                            const url = `https://${formState.shop}/?${formState.triggerUrlParam}`;
                                                            navigator.clipboard.writeText(url);
                                                            shopify.toast.show("Link copied to clipboard");
                                                        }}
                                                    >
                                                        Copy Link
                                                    </Button>
                                                }
                                            />

                                            <Divider />

                                            <Text as="h3" variant="headingMd">Audience Settings</Text>

                                            <Checkbox
                                                label="Show to existing members"
                                                checked={formState.showToMembers}
                                                onChange={(v) => updateField("showToMembers", v)}
                                            />

                                            <Checkbox
                                                label="Prevent duplicate submissions"
                                                checked={formState.preventDuplicates}
                                                onChange={(v) => updateField("preventDuplicates", v)}
                                            />

                                            <TextField
                                                type="number"
                                                label="Re-display after (days)"
                                                value={String(formState.redisplayAfterDays)}
                                                onChange={(v) => updateField("redisplayAfterDays", parseInt(v) || 0)}
                                                autoComplete="off"
                                                helpText="Days to wait before showing again to dismissed users"
                                            />
                                        </BlockStack>
                                    )}

                                    {/* CONTENT TAB */}
                                    {selectedTab === 1 && (
                                        <BlockStack gap="400">
                                            <Text as="h3" variant="headingMd">Images</Text>

                                            {/* Desktop Image */}
                                            <BlockStack gap="200">
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">Desktop Image</Text>
                                                <TextField
                                                    label="Image URL"
                                                    labelHidden
                                                    value={formState.desktopImage || ""}
                                                    onChange={(v) => updateField("desktopImage", v)}
                                                    autoComplete="off"
                                                    placeholder="https://example.com/image.jpg"
                                                    helpText="Paste a direct URL to your image"
                                                />
                                                {formState.desktopImage && (
                                                    <Box borderWidth="025" borderColor="border" borderRadius="200" padding="300">
                                                        <BlockStack gap="300">
                                                            <img
                                                                src={formState.desktopImage}
                                                                alt="Desktop preview"
                                                                style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4 }}
                                                            />
                                                            <Button
                                                                variant="plain"
                                                                tone="critical"
                                                                onClick={() => updateField("desktopImage", "")}
                                                            >
                                                                Clear URL
                                                            </Button>
                                                        </BlockStack>
                                                    </Box>
                                                )}
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    Recommended: 1:2 aspect ratio (portrait)
                                                </Text>
                                            </BlockStack>

                                            {/* Mobile Image */}
                                            <BlockStack gap="200">
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">Mobile Image (Optional)</Text>
                                                <TextField
                                                    label="Mobile Image URL"
                                                    labelHidden
                                                    value={formState.mobileImage || ""}
                                                    onChange={(v) => updateField("mobileImage", v)}
                                                    autoComplete="off"
                                                    placeholder="https://example.com/mobile-image.jpg"
                                                    helpText="Paste a direct URL to your mobile image"
                                                />
                                                {formState.mobileImage && (
                                                    <Box borderWidth="025" borderColor="border" borderRadius="200" padding="300">
                                                        <BlockStack gap="300">
                                                            <img
                                                                src={formState.mobileImage}
                                                                alt="Mobile preview"
                                                                style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4 }}
                                                            />
                                                            <Button
                                                                variant="plain"
                                                                tone="critical"
                                                                onClick={() => updateField("mobileImage", "")}
                                                            >
                                                                Clear URL
                                                            </Button>
                                                        </BlockStack>
                                                    </Box>
                                                )}
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    If empty, desktop image will be used on mobile
                                                </Text>
                                            </BlockStack>

                                            <Divider />

                                            <Select
                                                label="Image Position (Desktop)"
                                                options={[
                                                    { label: "Left", value: "left" },
                                                    { label: "Right", value: "right" },
                                                ]}
                                                value={formState.imagePosition}
                                                onChange={(v) => updateField("imagePosition", v)}
                                            />

                                            <Select
                                                label="Image Position (Mobile)"
                                                options={[
                                                    { label: "Top", value: "top" },
                                                    { label: "Bottom", value: "bottom" },
                                                    { label: "Hidden", value: "hidden" },
                                                ]}
                                                value={formState.mobileImagePosition}
                                                onChange={(v) => updateField("mobileImagePosition", v)}
                                            />

                                            <RangeSlider
                                                label={`Image Width: ${formState.imageRatio}%`}
                                                value={formState.imageRatio}
                                                onChange={(v) => updateField("imageRatio", v)}
                                                min={20}
                                                max={60}
                                                output
                                            />

                                            <Divider />

                                            <Text as="h3" variant="headingMd">Welcome Screen</Text>

                                            <TextField
                                                label="Title"
                                                value={formState.welcomeTitle}
                                                onChange={(v) => updateField("welcomeTitle", v)}
                                                autoComplete="off"
                                            />
                                            <TextField
                                                label="Subtitle"
                                                value={formState.welcomeSubtitle}
                                                onChange={(v) => updateField("welcomeSubtitle", v)}
                                                autoComplete="off"
                                                multiline={2}
                                            />
                                            <TextField
                                                label="Button Text"
                                                value={formState.welcomeButtonText}
                                                onChange={(v) => updateField("welcomeButtonText", v)}
                                                autoComplete="off"
                                            />

                                            <Divider />

                                            <Text as="h3" variant="headingMd">Success Screen</Text>

                                            <TextField
                                                label="Title"
                                                value={formState.successTitle}
                                                onChange={(v) => updateField("successTitle", v)}
                                                autoComplete="off"
                                            />
                                            <TextField
                                                label="Subtitle"
                                                value={formState.successSubtitle}
                                                onChange={(v) => updateField("successSubtitle", v)}
                                                autoComplete="off"
                                            />
                                            <FormLayout>
                                                <FormLayout.Group>
                                                    <TextField
                                                        label="Primary Button Text"
                                                        value={formState.successBtn1Text}
                                                        onChange={(v) => updateField("successBtn1Text", v)}
                                                        autoComplete="off"
                                                    />
                                                    <TextField
                                                        label="Primary Button Link"
                                                        value={formState.successBtn1Link}
                                                        onChange={(v) => updateField("successBtn1Link", v)}
                                                        autoComplete="off"
                                                        placeholder="https://..."
                                                    />
                                                </FormLayout.Group>

                                                <FormLayout.Group>
                                                    <TextField
                                                        label="Close Button Text"
                                                        value={formState.successBtn2Text}
                                                        onChange={(v) => updateField("successBtn2Text", v)}
                                                        autoComplete="off"
                                                        placeholder="e.g. No thanks"
                                                    />
                                                </FormLayout.Group>
                                            </FormLayout>
                                        </BlockStack>
                                    )}

                                    {/* FORM FIELDS TAB */}
                                    {selectedTab === 2 && (
                                        <BlockStack gap="400">
                                            <Banner tone="info">
                                                Subscribers will be saved directly to your Shopify Customers with "Subscribed" email marketing status.
                                            </Banner>

                                            <Text as="h3" variant="headingMd">Form Configuration</Text>

                                            <TextField
                                                label="Form Title"
                                                value={formState.formTitle}
                                                onChange={(v) => updateField("formTitle", v)}
                                                autoComplete="off"
                                            />
                                            <TextField
                                                label="Form Subtitle"
                                                value={formState.formSubtitle}
                                                onChange={(v) => updateField("formSubtitle", v)}
                                                autoComplete="off"
                                                multiline={2}
                                            />

                                            <Divider />

                                            <Text as="h3" variant="headingMd">Email Field</Text>
                                            <Checkbox
                                                label="Show email field"
                                                checked={formState.showEmailField}
                                                onChange={(v) => updateField("showEmailField", v)}
                                            />
                                            {formState.showEmailField && (
                                                <>
                                                    <Checkbox
                                                        label="Required"
                                                        checked={formState.emailRequired}
                                                        onChange={(v) => updateField("emailRequired", v)}
                                                    />
                                                    <TextField
                                                        label="Placeholder"
                                                        value={formState.emailPlaceholder}
                                                        onChange={(v) => updateField("emailPlaceholder", v)}
                                                        autoComplete="off"
                                                    />
                                                </>
                                            )}

                                            <Divider />

                                            <Text as="h3" variant="headingMd">Phone Field</Text>
                                            <Checkbox
                                                label="Show phone field"
                                                checked={formState.showPhoneField}
                                                onChange={(v) => updateField("showPhoneField", v)}
                                            />
                                            {formState.showPhoneField && (
                                                <>
                                                    <Checkbox
                                                        label="Required"
                                                        checked={formState.phoneRequired}
                                                        onChange={(v) => updateField("phoneRequired", v)}
                                                    />
                                                    <TextField
                                                        label="Placeholder"
                                                        value={formState.phonePlaceholder}
                                                        onChange={(v) => updateField("phonePlaceholder", v)}
                                                        autoComplete="off"
                                                    />
                                                </>
                                            )}

                                            <Divider />

                                            <TextField
                                                label="Submit Button Text"
                                                value={formState.formButtonText}
                                                onChange={(v) => updateField("formButtonText", v)}
                                                autoComplete="off"
                                            />
                                        </BlockStack>
                                    )}

                                    {/* DISCOUNT TAB */}
                                    {selectedTab === 3 && (
                                        <BlockStack gap="400">
                                            <Text as="h3" variant="headingMd">Discount Settings</Text>

                                            <Select
                                                label="Discount Type"
                                                options={[
                                                    { label: "No discount", value: "none" },
                                                    { label: "Use existing code", value: "existing" },
                                                    { label: "Auto-generate code", value: "auto" },
                                                ]}
                                                value={formState.discountType}
                                                onChange={(v) => updateField("discountType", v)}
                                            />

                                            {formState.discountType === "existing" && (
                                                <TextField
                                                    label="Discount Code"
                                                    value={formState.discountCode || ""}
                                                    onChange={(v) => updateField("discountCode", v)}
                                                    autoComplete="off"
                                                    helpText="Enter your existing discount code"
                                                />
                                            )}

                                            {formState.discountType === "auto" && (
                                                <BlockStack gap="300">
                                                    <TextField
                                                        type="number"
                                                        label="Discount Value (%)"
                                                        value={String(formState.discountValue)}
                                                        onChange={(v) => updateField("discountValue", parseInt(v) || 0)}
                                                        autoComplete="off"
                                                    />
                                                    <Banner tone="info">
                                                        A unique discount code will be generated for each subscriber.
                                                    </Banner>
                                                </BlockStack>
                                            )}
                                        </BlockStack>
                                    )}

                                    {/* STYLES TAB */}
                                    {selectedTab === 4 && (
                                        <BlockStack gap="400">
                                            <Text as="h3" variant="headingMd">Colors</Text>

                                            <FormLayout>
                                                <FormLayout.Group>
                                                    <TextField
                                                        label="Background Color"
                                                        value={formState.backgroundColor}
                                                        onChange={(v) => updateField("backgroundColor", v)}
                                                        autoComplete="off"
                                                        prefix={
                                                            <div
                                                                style={{
                                                                    width: 20,
                                                                    height: 20,
                                                                    backgroundColor: formState.backgroundColor,
                                                                    borderRadius: 4,
                                                                }}
                                                            />
                                                        }
                                                    />
                                                    <TextField
                                                        label="Text Color"
                                                        value={formState.textColor}
                                                        onChange={(v) => updateField("textColor", v)}
                                                        autoComplete="off"
                                                        prefix={
                                                            <div
                                                                style={{
                                                                    width: 20,
                                                                    height: 20,
                                                                    backgroundColor: formState.textColor,
                                                                    borderRadius: 4,
                                                                }}
                                                            />
                                                        }
                                                    />
                                                </FormLayout.Group>
                                                <FormLayout.Group>
                                                    <TextField
                                                        label="Accent Color (Buttons)"
                                                        value={formState.accentColor}
                                                        onChange={(v) => updateField("accentColor", v)}
                                                        autoComplete="off"
                                                        prefix={
                                                            <div
                                                                style={{
                                                                    width: 20,
                                                                    height: 20,
                                                                    backgroundColor: formState.accentColor,
                                                                    borderRadius: 4,
                                                                }}
                                                            />
                                                        }
                                                    />
                                                    <TextField
                                                        label="Overlay Color"
                                                        value={formState.overlayColor}
                                                        onChange={(v) => updateField("overlayColor", v)}
                                                        autoComplete="off"
                                                    />
                                                    <TextField
                                                        label="Input Border Color"
                                                        value={formState.inputBorderColor}
                                                        onChange={(v) => updateField("inputBorderColor", v)}
                                                        autoComplete="off"
                                                        connectedRight={<div style={{ width: 20, height: 20, background: formState.inputBorderColor, borderRadius: 4, border: "1px solid #ccc" }} />}
                                                    />
                                                </FormLayout.Group>
                                            </FormLayout>

                                            <Divider />

                                            <Text as="h3" variant="headingMd">Shape & Style</Text>

                                            <RangeSlider
                                                label={`Border Radius: ${formState.borderRadius}px`}
                                                value={formState.borderRadius}
                                                onChange={(v) => updateField("borderRadius", v)}
                                                min={0}
                                                max={32}
                                                output
                                            />

                                            <Select
                                                label="Button Style"
                                                options={[
                                                    { label: "Filled", value: "filled" },
                                                    { label: "Outline", value: "outline" },
                                                    { label: "Text Only", value: "text" },
                                                ]}
                                                value={formState.buttonStyle}
                                                onChange={(v) => updateField("buttonStyle", v)}
                                            />

                                            <Select
                                                label="Close Button Style"
                                                options={[
                                                    { label: "Circle", value: "circle" },
                                                    { label: "Square", value: "square" },
                                                    { label: "X only", value: "x" },
                                                ]}
                                                value={formState.closeButtonStyle}
                                                onChange={(v) => updateField("closeButtonStyle", v)}
                                            />

                                            <TextField
                                                label="No Thanks Text"
                                                value={formState.noThanksText}
                                                onChange={(v) => updateField("noThanksText", v)}
                                                autoComplete="off"
                                            />

                                            <Box paddingBlockStart="400">
                                                <Text as="h3" variant="headingSm">Font Sizes (px)</Text>
                                                <BlockStack gap="300">
                                                    <RangeSlider
                                                        label={`Title Size: ${formState.titleFontSize}px`}
                                                        value={formState.titleFontSize}
                                                        onChange={(v) => updateField("titleFontSize", v)}
                                                        min={20}
                                                        max={80}
                                                        output
                                                    />
                                                    <RangeSlider
                                                        label={`Subtitle Size: ${formState.subtitleFontSize}px`}
                                                        value={formState.subtitleFontSize}
                                                        onChange={(v) => updateField("subtitleFontSize", v)}
                                                        min={12}
                                                        max={40}
                                                        output
                                                    />
                                                    <RangeSlider
                                                        label={`Button Size: ${formState.buttonFontSize}px`}
                                                        value={formState.buttonFontSize}
                                                        onChange={(v) => updateField("buttonFontSize", v)}
                                                        min={12}
                                                        max={30}
                                                        output
                                                    />
                                                </BlockStack>
                                            </Box>

                                            <Box paddingBlockStart="400">
                                                <Text as="h3" variant="headingSm">Mobile Font Sizes (px)</Text>
                                                <BlockStack gap="300">
                                                    <RangeSlider
                                                        label={`Title Size: ${formState.titleFontSizeMobile}px`}
                                                        value={formState.titleFontSizeMobile}
                                                        onChange={(v) => updateField("titleFontSizeMobile", v)}
                                                        min={16}
                                                        max={40}
                                                        output
                                                    />
                                                    <RangeSlider
                                                        label={`Subtitle Size: ${formState.subtitleFontSizeMobile}px`}
                                                        value={formState.subtitleFontSizeMobile}
                                                        onChange={(v) => updateField("subtitleFontSizeMobile", v)}
                                                        min={10}
                                                        max={24}
                                                        output
                                                    />
                                                    <RangeSlider
                                                        label={`Button Size: ${formState.buttonFontSizeMobile}px`}
                                                        value={formState.buttonFontSizeMobile}
                                                        onChange={(v) => updateField("buttonFontSizeMobile", v)}
                                                        min={10}
                                                        max={24}
                                                        output
                                                    />
                                                </BlockStack>
                                            </Box>

                                            <Select
                                                label="Font Family"
                                                options={[
                                                    { label: "Inherit from theme", value: "inherit" },
                                                    { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
                                                    { label: "Playfair Display", value: "'Playfair Display', serif" },
                                                    { label: "Montserrat", value: "'Montserrat', sans-serif" },
                                                    { label: "Roboto", value: "'Roboto', sans-serif" },
                                                ]}
                                                value={formState.fontFamily}
                                                onChange={(v) => updateField("fontFamily", v)}
                                            />
                                        </BlockStack>
                                    )}
                                </Box>
                            </Tabs>
                        </Card>
                    </BlockStack >
                </Layout.Section >

                {/* Preview Section */}
                < Layout.Section variant="oneThird" >
                    <Card>
                        <BlockStack gap="300">
                            <Text as="h2" variant="headingMd">Preview</Text>
                            <Box
                                padding="200"
                                background="bg-surface-secondary"
                                borderRadius="200"
                                minHeight="300px"
                            >
                                <div
                                    style={{
                                        backgroundColor: formState.backgroundColor,
                                        color: formState.textColor,
                                        borderRadius: formState.borderRadius,
                                        padding: "20px",
                                        fontSize: "12px",
                                        minHeight: "250px",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        textAlign: "center",
                                        fontFamily: formState.fontFamily,
                                    }}
                                >
                                    <h3 style={{ margin: 0, marginBottom: 8 }}>{formState.welcomeTitle || "Title"}</h3>
                                    <p style={{ margin: 0, marginBottom: 16, opacity: 0.8, fontSize: 10 }}>
                                        {formState.welcomeSubtitle || "Subtitle"}
                                    </p>
                                    <button
                                        style={{
                                            backgroundColor: formState.buttonStyle === "filled" ? formState.accentColor : "transparent",
                                            color: formState.buttonStyle === "filled" ? "#000" : formState.accentColor,
                                            border: formState.buttonStyle === "outline" ? `2px solid ${formState.accentColor}` : "none",
                                            padding: "8px 16px",
                                            borderRadius: 6,
                                            cursor: "pointer",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {formState.welcomeButtonText || "Button"}
                                    </button>
                                </div>
                            </Box>
                            <Text as="p" variant="bodySm" tone="subdued">
                                This is a simplified preview. The actual popup will look better on your store.
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section >
            </Layout >
        </Page >
    );
}
