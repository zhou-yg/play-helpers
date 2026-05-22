'use client';

interface VideoPreviewProps {
  filePath: string;
}

export function VideoPreview({ filePath }: VideoPreviewProps) {
  const fileUrl = `/api/file?path=${encodeURIComponent(filePath)}`;

  return (
    <div className="flex items-center justify-center h-full p-4">
      <video
        src={fileUrl}
        controls
        className="max-w-full max-h-full rounded-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
