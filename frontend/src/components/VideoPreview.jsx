function VideoPreview({
  metadataLoading,
  thumbnailUrl,
  videoMetadata,
  lectureData,
  previewVideoId,
}) {
  if (metadataLoading) {
    return (
      <section className="preview-section section-shell">
        <div className="metadata-card metadata-skeleton">
          <div className="skeleton-thumbnail"></div>
          <div className="skeleton-content">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line skeleton-short"></div>
          </div>
        </div>
      </section>
    );
  }

  if (!thumbnailUrl) {
    return null;
  }

  return (
    <section className="preview-section section-shell">
      <div className="section-heading">
        <p className="preview-label">Video Preview</p>
        <h2>Lecture detected</h2>
      </div>

      <div className="metadata-card">
        <div className="thumbnail-frame">
          <img src={thumbnailUrl} alt="YouTube lecture thumbnail preview" />
          <div className="thumbnail-shine"></div>
        </div>

        <div className="metadata-content">
          <h2>
            {videoMetadata?.title ||
              (lectureData
                ? "Lecture ready for learning"
                : "Preview detected from your link")}
          </h2>
          <p className="channel-name">
            {videoMetadata?.author_name || "YouTube Lecture"}
          </p>
          <p className="ready-pill">Ready for AI learning</p>

          {previewVideoId && (
            <p className="video-id">
              Video ID: <span>{previewVideoId}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default VideoPreview;
