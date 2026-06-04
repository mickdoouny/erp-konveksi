import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sanitizeUploadFilename } from "@/lib/upload-filename";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData =
      await request.formData();

    const files =
      formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tidak ada file",
        },
        {
          status: 400,
        }
      );
    }

    const uploadPath = path.join(
      process.cwd(),
      "public",
      "uploads"
    );

    if (
      !fs.existsSync(uploadPath)
    ) {
      fs.mkdirSync(uploadPath, {
        recursive: true,
      });
    }

    const saveAsRaw = formData.get("saveAs");
    const saveAs =
      typeof saveAsRaw === "string" && saveAsRaw.trim()
        ? sanitizeUploadFilename(saveAsRaw)
        : null;

    const uploadedFiles = [];

    for (const file of files) {
      const bytes =
        await file.arrayBuffer();

      const buffer =
        Buffer.from(bytes);

      const filename =
        saveAs ??
        `${Date.now()}-${file.name.replace(/\s/g, "-")}`;

      const filepath =
        path.join(
          uploadPath,
          filename
        );

      fs.writeFileSync(
        filepath,
        buffer
      );

      uploadedFiles.push({
        name: filename,
        url: `/uploads/${filename}`,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error(
      "UPLOAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Upload gagal",
      },
      {
        status: 500,
      }
    );
  }
}