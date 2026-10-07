import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdmin } from "@/lib/admin-auth";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const imagePath = /^products\/product-[a-f0-9-]+\.(?:jpg|png|webp)$/i;
const maxImageSize = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await getAdmin())) throw new Error("Unauthorized");
        if (!imagePath.test(pathname)) throw new Error("Invalid product image path");
        return {
          allowedContentTypes: imageTypes,
          maximumSizeInBytes: maxImageSize,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to authorize image upload" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 },
    );
  }
}