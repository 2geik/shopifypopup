import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    Button,
    InlineStack,
    Box,
    Badge,
    IndexTable,
    EmptyState,
    TextField,
    Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const subscribers = await prisma.subscriber.findMany({
        where: { shop },
        include: {
            campaign: {
                select: { title: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const totalCount = subscribers.length;

    return json({
        subscribers,
        totalCount,
    });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "export") {
        const subscribers = await prisma.subscriber.findMany({
            where: { shop },
            include: { campaign: { select: { title: true } } },
            orderBy: { createdAt: "desc" },
        });

        // Generate CSV
        const csv = [
            ["Email", "Phone", "Campaign", "Discount Code", "Created At"].join(","),
            ...subscribers.map((s) =>
                [
                    s.email || "",
                    s.phone || "",
                    s.campaign.title,
                    s.discountCode || "",
                    s.createdAt.toISOString(),
                ].join(",")
            ),
        ].join("\n");

        return json({ csv, filename: `subscribers-${Date.now()}.csv` });
    }

    return json({ success: true });
};

export default function Subscribers() {
    const { subscribers, totalCount } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const [searchQuery, setSearchQuery] = useState("");

    const handleExport = () => {
        fetcher.submit({ intent: "export" }, { method: "POST" });
    };

    // Download CSV when data is available
    if (fetcher.data && "csv" in fetcher.data) {
        const blob = new Blob([fetcher.data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fetcher.data.filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    const filteredSubscribers = searchQuery
        ? subscribers.filter(
            (s) =>
                s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.phone?.includes(searchQuery)
        )
        : subscribers;

    const rowMarkup = filteredSubscribers.map((subscriber, index) => (
        <IndexTable.Row id={subscriber.id} key={subscriber.id} position={index}>
            <IndexTable.Cell>
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {subscriber.email || "-"}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>{subscriber.phone || "-"}</IndexTable.Cell>
            <IndexTable.Cell>
                <Badge>{subscriber.campaign.title}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
                {subscriber.discountCode ? (
                    <code style={{ padding: "2px 6px", background: "#f0f0f0", borderRadius: 4 }}>
                        {subscriber.discountCode}
                    </code>
                ) : (
                    "-"
                )}
            </IndexTable.Cell>
            <IndexTable.Cell>
                {new Date(subscriber.createdAt).toLocaleDateString()}
            </IndexTable.Cell>
        </IndexTable.Row>
    ));

    return (
        <Page
            backAction={{ content: "Back", url: "/app" }}
            title="Subscribers"
            subtitle={`${totalCount} total subscribers`}
            primaryAction={{
                content: "Export CSV",
                onAction: handleExport,
                loading: fetcher.state === "submitting",
            }}
        >
            <TitleBar title="Subscribers" />
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        {subscribers.length === 0 ? (
                            <Box padding="400">
                                <EmptyState
                                    heading="No subscribers yet"
                                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                >
                                    <p>
                                        When visitors sign up through your popups, they'll appear here.
                                    </p>
                                </EmptyState>
                            </Box>
                        ) : (
                            <BlockStack gap="0">
                                <Box padding="400">
                                    <TextField
                                        label=""
                                        labelHidden
                                        placeholder="Search by email or phone..."
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        autoComplete="off"
                                        clearButton
                                        onClearButtonClick={() => setSearchQuery("")}
                                    />
                                </Box>
                                <IndexTable
                                    resourceName={{ singular: "subscriber", plural: "subscribers" }}
                                    itemCount={filteredSubscribers.length}
                                    headings={[
                                        { title: "Email" },
                                        { title: "Phone" },
                                        { title: "Campaign" },
                                        { title: "Discount Code" },
                                        { title: "Date" },
                                    ]}
                                    selectable={false}
                                >
                                    {rowMarkup}
                                </IndexTable>
                            </BlockStack>
                        )}
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
