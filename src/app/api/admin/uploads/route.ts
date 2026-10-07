import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdmin } from "@/lib/admin-auth";

const rasterTypes = ["image/jpeg", "image/png", "image/webp"];
const imagePath = /^products\/product-[a-f0-9-]+\.(?:jpg|png|webp)$/i;
const framePath = /^products\/360\/product-[a-f0-9-]+\.(?:jpg|png|webp)$/i;
const videoPath = /^products\/videos\/product-[a-f0-9-]+\.(?:mp4|webm)$/i;
const maxImageSize = 5 * 1024 * 1024;
const maxVideoSize = 100 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await getAdmin())) throw new Error("Unauthorized");
        const isVideo = videoPath.test(pathname);
        if (!imagePath.test(pathname) && !framePath.test(pathname) && !isVideo) throw new Error("Invalid product media path");
        return {
          allowedContentTypes: isVideo ? ["video/mp4", "video/webm"] : rasterTypes,
          maximumSizeInBytes: isVideo ? maxVideoSize : maxImageSize,
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