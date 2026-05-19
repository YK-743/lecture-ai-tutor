import { useMemo, useState } from "react";
import "./App.css";

const CUSTOM_MODAL_TEXT = `Lecture AI Tutor

Transcript prompt copied to clipboard.

Instructions:

1. Paste the copied prompt in the GPT chat.
2. Learn interactively.
3. Ask doubts anytime.
4. Type "end session" when finished to receive premium lecture notes.`;

function getVideoIdFromUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.hostname === "www.youtube.com" ||
      parsedUrl.hostname === "youtube.com"
    ) {
      return parsedUrl.searchParams.get("v");
    }

    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.replace("/", "");
    }

    return "";
  } catch {
    return "";
  }
}

function App() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [lectureData, setLectureData] = useState(null);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const previewVideoId = useMemo(() => {
    return lectureData?.video_id || getVideoIdFromUrl(youtubeUrl);
  }, [youtubeUrl, lectureData]);

  const thumbnailUrl = previewVideoId
    ? `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg`
    : "";

  async function startLearning() {
    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube lecture link.");
      return;
    }

    setLoading(true);
    setLectureData(null);
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/prepare-learning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not prepare this lecture.");
      }

      setLectureData(data);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong. Please check your YouTube link and backend server."
      );
    } finally {
      setLoading(false);
    }
  }

  async function openTutor() {
    if (!lectureData) {
      return;
    }

    try {
      await navigator.clipboard.writeText(lectureData.teaching_prompt);
      setShowModal(true);
    } catch {
      setError("Could not copy the prompt. Please try again.");
    }
  }

  function continueLearning() {
    if (lectureData?.custom_gpt_url) {
      window.open(lectureData.custom_gpt_url, "_blank");
    }

    setShowModal(false);
  }

  function closeModal() {
    setShowModal(false);
  }

  return (
    <main className="app-shell">
      <div className="glow glow-blue"></div>
      <div className="glow glow-purple"></div>
      <div className="grid-overlay"></div>

      <section className="hero-card">
        <div className="brand-row">
          <div className="brand-mark">AI</div>
          <div>
            <p className="eyebrow">Personal coding lecture companion</p>
            <h1>Lecture AI Tutor</h1>
          </div>
        </div>

        <p className="hero-copy">
          Turn a YouTube coding lecture into a guided learning session with
          your custom GPT tutor.
        </p>

        <div className="input-panel">
          <label htmlFor="youtube-url">YouTube lecture link</label>

          <div className="input-wrap">
            <input
              id="youtube-url"
              type="text"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="Paste YouTube lecture link here"
            />
          </div>

          <button
            className="primary-button"
            onClick={startLearning}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-inline">
                <span className="spinner"></span>
                Analyzing lecture...
              </span>
            ) : (
              "Analyze Lecture"
            )}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {thumbnailUrl && (
          <div className="preview-card">
            <div className="thumbnail-frame">
              <img src={thumbnailUrl} alt="YouTube lecture thumbnail preview" />
              <div className="thumbnail-shine"></div>
            </div>

            <div className="preview-content">
              <p className="preview-label">Thumbnail Preview</p>
              <p className="preview-title">
                {lectureData
                  ? "Lecture ready for learning"
                  : "Preview detected from your link"}
              </p>
              {previewVideoId && (
                <p className="video-id">
                  Video ID: <span>{previewVideoId}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="premium-loader">
            <div className="loader-orbit">
              <span></span>
              <span></span>
            </div>
            <div>
              <p>Preparing your AI tutor</p>
              <small>Fetching transcript and building your learning prompt</small>
            </div>
          </div>
        )}

        {lectureData && (
          <div className="success-card">
            <div>
              <p className="success-kicker">Ready</p>
              <h2>Lecture ready for learning</h2>
              <p>
                Your transcript prompt is prepared. The next click copies it,
                opens your custom GPT, and lets you paste it there.
              </p>
              <p className="video-id success-video-id">
                Video ID: <span>{lectureData.video_id}</span>
              </p>
            </div>

            <button className="tutor-button" onClick={openTutor}>
              Learn With AI Tutor
            </button>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-icon">✓</div>
            <h2>Prompt copied</h2>
            <p>Paste it in Lecture AI Tutor.</p>

            <div className="modal-instructions">
              {CUSTOM_MODAL_TEXT.split("\n").map((line, index) => (
                <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
              ))}
            </div>

            <button className="modal-button" onClick={continueLearning}>
              Continue Learning
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;