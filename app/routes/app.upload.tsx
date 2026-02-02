import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// GraphQL mutation to create staged upload target
const STAGED_UPLOADS_CREATE = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// GraphQL mutation to create file from staged upload
const FILE_CREATE = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        alt
        ... on MediaImage {
          id
          image {
            url
            originalSrc
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "getStagedUpload") {
    // Step 1: Create staged upload target
    const filename = formData.get("filename") as string;
    const mimeType = formData.get("mimeType") as string;
    const fileSize = formData.get("fileSize") as string;

    try {
      const response = await admin.graphql(STAGED_UPLOADS_CREATE, {
        variables: {
          input: [{
            filename,
            mimeType,
            resource: "IMAGE",
            httpMethod: "POST",
            fileSize: fileSize,
          }],
        },
      });

      const data = await response.json();

      if (data.data?.stagedUploadsCreate?.userErrors?.length > 0) {
        return json({
          error: data.data.stagedUploadsCreate.userErrors[0].message
        }, { status: 400 });
      }

      const target = data.data?.stagedUploadsCreate?.stagedTargets?.[0];

      if (!target) {
        return json({ error: "Failed to create upload target" }, { status: 500 });
      }

      return json({
        uploadUrl: target.url,
        resourceUrl: target.resourceUrl,
        parameters: target.parameters,
      });
    } catch (error) {
      console.error("Staged upload error:", error);
      return json({ error: "Failed to create upload target" }, { status: 500 });
    }
  }

  if (intent === "createFile") {
    // Step 2: Create file record from staged upload
    const resourceUrl = formData.get("resourceUrl") as string;
    const filename = formData.get("filename") as string;

    try {
      const response = await admin.graphql(FILE_CREATE, {
        variables: {
          files: [{
            originalSource: resourceUrl,
            alt: filename,
            contentType: "IMAGE",
          }],
        },
      });

      const data = await response.json();

      if (data.data?.fileCreate?.userErrors?.length > 0) {
        return json({
          error: data.data.fileCreate.userErrors[0].message
        }, { status: 400 });
      }

      const file = data.data?.fileCreate?.files?.[0];

      // The file might still be processing, get the URL
      const imageUrl = file?.image?.url || file?.image?.originalSrc || resourceUrl;

      return json({
        success: true,
        fileId: file?.id,
        imageUrl,
      });
    } catch (error) {
      console.error("File create error:", error);
      return json({ error: "Failed to create file" }, { status: 500 });
    }
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};
