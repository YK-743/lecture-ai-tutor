import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import "./App.css";
import { auth, provider } from "./firebase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CUSTOM_MODAL_TEXT = `Lecture AI Tutor

Transcript prompt copied to clipboard.

Instructions:

1. Paste the copied prompt in the GPT chat.
2. Learn interactively.
3. Ask doubts anytime.
4. Type "end session" when finished to receive premium lecture notes.`;

const LOADING_STEPS = [
  "Validating YouTube link",
  "Fetching transcript",
  "Preparing AI tutor",
  "Almost ready...",
];

const PENDING_YOUTUBE_URL_KEY = "pendingYoutubeUrl";
const PENDING_PREVIEW_STATE_KEY = "pendingYoutubePreviewState";
const LOGIN_MODAL_DISMISSED_KEY = "loginModalDismissed";
const LOGIN_HANDLED_KEY = "loginHandled";
const LOGIN_SUCCESS_TOAST_KEY = "loginSuccessToastPending";

function getVideoIdFromUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.hostname === "www.youtube.com" ||
      parsedUrl.hostname === "youtube.com"
    ) {
      return parsedUrl.searchParams.get("v") || "";
    }

    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.replace("/", "") || "";
    }

    return "";
  } catch {
    return "";
  }
}

function App() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [lectureData, setLectureData] = useState(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [restoredPreviewUrl, setRestoredPreviewUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const previewVideoId = useMemo(() => {
    return lectureData?.video_id || getVideoIdFromUrl(youtubeUrl);
  }, [youtubeUrl, lectureData]);

  const fallbackThumbnailUrl = previewVideoId
    ? `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg`
    : "";

  const thumbnailUrl = videoMetadata?.thumbnail_url || fallbackThumbnailUrl;

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setToastMessage("");
    }, 2600);

    return () => clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("AUTH USER:", currentUser);

      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        sessionStorage.setItem(LOGIN_HANDLED_KEY, "true");
        sessionStorage.setItem(LOGIN_MODAL_DISMISSED_KEY, "true");

        const pendingPreviewState = localStorage.getItem(
          PENDING_PREVIEW_STATE_KEY
        );
        const pendingYoutubeUrl = localStorage.getItem(PENDING_YOUTUBE_URL_KEY);

        if (pendingPreviewState) {
          try {
            const savedPreview = JSON.parse(pendingPreviewState);

            if (savedPreview.youtubeUrl) {
              setYoutubeUrl(savedPreview.youtubeUrl);
              setRestoredPreviewUrl(savedPreview.youtubeUrl);
            }

            if (savedPreview.videoMetadata) {
              setVideoMetadata(savedPreview.videoMetadata);
            }

            setMetadataLoading(false);
            localStorage.removeItem(PENDING_PREVIEW_STATE_KEY);
            localStorage.removeItem(PENDING_YOUTUBE_URL_KEY);
          } catch {
            localStorage.removeItem(PENDING_PREVIEW_STATE_KEY);
          }
        } else if (pendingYoutubeUrl) {
          setYoutubeUrl(pendingYoutubeUrl);
          localStorage.removeItem(PENDING_YOUTUBE_URL_KEY);
        }

        setAuthMessage("");
        setShowLoginModal(false);

        if (localStorage.getItem(LOGIN_SUCCESS_TOAST_KEY)) {
          setToastMessage("✅ Signed in successfully");
          localStorage.removeItem(LOGIN_SUCCESS_TOAST_KEY);
        }
      } else {
        const loginHandled = sessionStorage.getItem(LOGIN_HANDLED_KEY);
        const loginModalDismissed = sessionStorage.getItem(LOGIN_MODAL_DISMISSED_KEY);

        if (!loginHandled && !loginModalDismissed) {
          setShowLoginModal(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }

    const intervalId = setInterval(() => {
      setLoadingStep((currentStep) =>
        currentStep >= LOADING_STEPS.length - 1 ? currentStep : currentStep + 1
      );
    }, 1500);

    return () => clearInterval(intervalId);
  }, [loading]);

  useEffect(() => {
    const trimmedUrl = youtubeUrl.trim();
    const videoId = getVideoIdFromUrl(trimmedUrl);

    setLectureData(null);
    setError("");

    if (!videoId) {
      setVideoMetadata(null);
      setMetadataLoading(false);
      return;
    }

    if (restoredPreviewUrl && trimmedUrl === restoredPreviewUrl) {
      setRestoredPreviewUrl("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setMetadataLoading(true);

        const response = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            trimmedUrl
          )}&format=json`
        );

        if (!response.ok) {
          throw new Error("Could not fetch video details.");
        }

        const data = await response.json();
        setVideoMetadata(data);
      } catch {
        setVideoMetadata(null);
      } finally {
        setMetadataLoading(false);
      }
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [youtubeUrl, restoredPreviewUrl]);

  async function handleGoogleSignIn() {
    setError("");
    setAuthMessage("");

    try {
      if (youtubeUrl.trim()) {
        const previewState = {
          youtubeUrl,
          videoMetadata,
          thumbnailUrl,
          title: videoMetadata?.title || "",
          channelName: videoMetadata?.author_name || "",
        };

        localStorage.setItem(PENDING_YOUTUBE_URL_KEY, youtubeUrl);
        localStorage.setItem(
          PENDING_PREVIEW_STATE_KEY,
          JSON.stringify(previewState)
        );
      }

      sessionStorage.setItem(LOGIN_HANDLED_KEY, "true");
      localStorage.setItem(LOGIN_SUCCESS_TOAST_KEY, "true");
      await signInWithRedirect(auth, provider);
    } catch {
      localStorage.removeItem(LOGIN_SUCCESS_TOAST_KEY);
      setAuthMessage("Google sign in was not completed. Please try again.");
    }
  }

  async function handleLogout() {
    setError("");
    setAuthMessage("");

    try {
      sessionStorage.removeItem(LOGIN_HANDLED_KEY);
      sessionStorage.removeItem(LOGIN_MODAL_DISMISSED_KEY);
      await signOut(auth);
      setLectureData(null);
      setShowLoginModal(false);
      setToastMessage("Signed out successfully");
    } catch {
      setAuthMessage("Logout failed. Please try again.");
    }
  }

  async function startLearning() {
    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube lecture link.");
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setLectureData(null);
    setError("");
    setAuthMessage("");

    try {
      const response = await fetch(BACKEND_URL, {
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

  function closeLoginModal() {
    sessionStorage.setItem(LOGIN_MODAL_DISMISSED_KEY, "true");
    sessionStorage.setItem(LOGIN_HANDLED_KEY, "true");
    setShowLoginModal(false);
  }

  function openLoginModal() {
    setAuthMessage("");
    setShowLoginModal(true);
  }

  return (
    <main className="app-shell">
      <div className="glow glow-blue"></div>
      <div className="glow glow-purple"></div>
      <div className="glow glow-cyan"></div>
      <div className="grid-overlay"></div>

      <section className="hero-card">
        <div className="top-bar">
          <div className="brand-row">
            <div className="brand-mark">AI</div>
            <div>
              <p className="eyebrow">Personal coding lecture companion</p>
              <h1>Lecture AI Tutor</h1>
            </div>
          </div>

          <div className="auth-panel">
            {!authReady ? null : user ? (
              <div className="auth-status-card signed-in-status">
                <span className="online-dot"></span>
                <img
                  src={user.photoURL || ""}
                  alt={user.displayName || "Google user"}
                  className="user-avatar"
                />
                <div className="user-copy">
                  <span>Signed In</span>
                  <strong>{user.displayName || "Google User"}</strong>
                </div>
                <button className="logout-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <button className="auth-status-card guest-status" onClick={openLoginModal}>
                <div className="guest-orb"></div>
                <div className="guest-copy">
                  <strong>Guest Mode</strong>
                  <span>Sign in to sync learning progress</span>
                </div>
              </button>
            )}
          </div>
        </div>

        <p className="hero-copy">
          Turn a YouTube coding lecture into a guided learning session with
          your custom GPT tutor.
        </p>

        {authMessage && <div className="auth-message">{authMessage}</div>}

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

        {metadataLoading && (
          <div className="metadata-card metadata-skeleton">
            <div className="skeleton-thumbnail"></div>
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line skeleton-short"></div>
            </div>
          </div>
        )}

        {!metadataLoading && thumbnailUrl && (
          <div className="metadata-card">
            <div className="thumbnail-frame">
              <img src={thumbnailUrl} alt="YouTube lecture thumbnail preview" />
              <div className="thumbnail-shine"></div>
            </div>

            <div className="metadata-content">
              <p className="preview-label">Video Preview</p>
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
        )}

        {loading && (
          <div className="premium-loader">
            <div className="loader-header">
              <div className="loader-orbit">
                <span></span>
                <span></span>
              </div>

              <div>
                <p>{LOADING_STEPS[loadingStep]}</p>
                <small>Building your guided learning session</small>
              </div>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%`,
                }}
              ></div>
            </div>

            <div className="step-list">
              {LOADING_STEPS.map((step, index) => (
                <div
                  className={`step-item ${
                    index === loadingStep ? "active" : ""
                  } ${index < loadingStep ? "complete" : ""}`}
                  key={step}
                >
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
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
                shows your instructions, and then opens your custom GPT.
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
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
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

      {showLoginModal && !user && (
        <div className="modal-backdrop login-modal-backdrop" onClick={closeLoginModal}>
          <div
            className="login-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="login-modal-glow"></div>
            <div className="login-modal-icon">AI</div>
            <h2>Sign in to Continue</h2>
            <p>
              Save your learning progress and unlock AI-powered study sessions
            </p>

            <button className="google-button login-google-button" onClick={handleGoogleSignIn}>
              <span className="google-icon" aria-hidden="true">
                <span className="google-g">G</span>
              </span>
              Continue with Google
            </button>

            <button className="cancel-login-button" onClick={closeLoginModal}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {toastMessage && <div className="auth-toast">{toastMessage}</div>}
    </main>
  );
}

export default App;
