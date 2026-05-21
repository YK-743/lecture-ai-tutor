import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import "./App.css";
import { auth, db, provider } from "./firebase";

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

const AVATAR_OPTIONS = [
  { id: "aurora", label: "Aurora", gradient: "linear-gradient(135deg, #2563eb, #22d3ee)" },
  { id: "nova", label: "Nova", gradient: "linear-gradient(135deg, #7c3aed, #ec4899)" },
  { id: "ember", label: "Ember", gradient: "linear-gradient(135deg, #f97316, #ef4444)" },
  { id: "mint", label: "Mint", gradient: "linear-gradient(135deg, #059669, #84cc16)" },
  { id: "orbit", label: "Orbit", gradient: "linear-gradient(135deg, #0f172a, #6366f1)" },
  { id: "solar", label: "Solar", gradient: "linear-gradient(135deg, #eab308, #f97316)" },
  { id: "violet", label: "Violet", gradient: "linear-gradient(135deg, #9333ea, #38bdf8)" },
  { id: "rose", label: "Rose", gradient: "linear-gradient(135deg, #be123c, #fb7185)" },
  { id: "steel", label: "Steel", gradient: "linear-gradient(135deg, #475569, #14b8a6)" },
  { id: "cosmic", label: "Cosmic", gradient: "linear-gradient(135deg, #111827, #a855f7)" },
];

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

function getDefaultUsername(user) {
  return user?.displayName || user?.email?.split("@")[0] || "User";
}

function getProviderName(user) {
  const primaryProvider = user.providerData?.[0]?.providerId;
  return primaryProvider === "google.com" ? "google" : "email";
}

async function getExistingUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  }

  return null;
}

async function getUserProfileByEmail(email) {
  const usersQuery = query(
    collection(db, "users"),
    where("email", "==", email.trim().toLowerCase())
  );
  const usersSnapshot = await getDocs(usersQuery);

  return usersSnapshot.empty ? null : usersSnapshot.docs[0].data();
}

async function checkEmailAccount(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingProfile = await getUserProfileByEmail(normalizedEmail);

  return {
    exists: Boolean(existingProfile),
    profile: existingProfile,
  };
}

function getAvatarOption(avatarId) {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId);
}

function isPopupClosedError(error) {
  return error?.code === "auth/popup-closed-by-user";
}

function getFriendlyAuthMessage(error) {
  switch (error?.code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect password";
    case "auth/email-already-in-use":
      return "Account already exists. Please log in.";
    case "auth/user-not-found":
      return "No account found. Please sign up.";
    case "auth/invalid-email":
      return "Please enter a valid email";
    case "auth/weak-password":
      return "Password should be at least 6 characters";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "Authentication failed. Please try again.";
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
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [authCardOpen, setAuthCardOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authActionMode, setAuthActionMode] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [setupUsername, setSetupUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].id);
  const [uploadedAvatar, setUploadedAvatar] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const previewVideoId = useMemo(() => {
    return lectureData?.video_id || getVideoIdFromUrl(youtubeUrl);
  }, [youtubeUrl, lectureData]);

  const fallbackThumbnailUrl = previewVideoId
    ? `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg`
    : "";

  const thumbnailUrl = videoMetadata?.thumbnail_url || fallbackThumbnailUrl;
  const userLabel = userProfile?.username || getDefaultUsername(user);
  const profileAvatar = userProfile?.avatar || uploadedAvatar || selectedAvatar;
  const userInitial = userLabel.charAt(0).toUpperCase();

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("AUTH USER:", currentUser);

      setUser(currentUser);
      setAuthReady(true);

      if (!currentUser) {
        setProfileOpen(false);
        setUserProfile(null);
        setNeedsProfileSetup(false);
        return;
      }

      try {
        const existingProfile = await getExistingUserProfile(currentUser);

        if (existingProfile) {
          setUserProfile(existingProfile);
          setNeedsProfileSetup(false);
        } else {
          setUserProfile(null);
          setSetupUsername(getDefaultUsername(currentUser));
          setSelectedAvatar(AVATAR_OPTIONS[0].id);
          setUploadedAvatar("");
          setNeedsProfileSetup(true);
        }
      } catch (profileError) {
        console.error("Could not load user profile:", profileError);
      }

      setAuthMessage("");
      setAuthCardOpen(false);
      setProfileOpen(false);
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
  }, [youtubeUrl]);

  async function handleGoogleSignIn() {
    setError("");
    setAuthMessage("");
    setAuthActionMode("");
    setAuthSubmitting(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const existingProfile = await getExistingUserProfile(result.user);

      if (existingProfile) {
        setUserProfile(existingProfile);
        setNeedsProfileSetup(false);
      } else {
        setUserProfile(null);
        setSetupUsername(getDefaultUsername(result.user));
        setSelectedAvatar(AVATAR_OPTIONS[0].id);
        setUploadedAvatar("");
        setNeedsProfileSetup(true);
      }

      setToastMessage("Signed in successfully");
    } catch (authError) {
      if (!isPopupClosedError(authError)) {
        setAuthMessage(getFriendlyAuthMessage(authError));
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleEmailLogin(event) {
    event.preventDefault();
    setError("");
    setAuthMessage("");
    setAuthActionMode("");
    setAuthSubmitting(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        authEmail.trim().toLowerCase(),
        authPassword
      );
      setToastMessage("Signed in successfully");
      setAuthEmail("");
      setAuthPassword("");
    } catch (authError) {
      if (authError.code === "auth/user-not-found") {
        setAuthMessage("No account found. Please sign up.");
        setAuthActionMode("signup");
      } else if (
        authError.code === "auth/wrong-password" ||
        authError.code === "auth/invalid-credential"
      ) {
        const account = await checkEmailAccount(authEmail);

        if (account.exists) {
          setAuthMessage("Incorrect password");
        } else {
          setAuthMessage("No account found. Please sign up.");
          setAuthActionMode("signup");
        }
      } else {
        setAuthMessage(getFriendlyAuthMessage(authError));
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleEmailSignup(event) {
    event.preventDefault();
    setError("");
    setAuthMessage("");
    setAuthActionMode("");
    setAuthSubmitting(true);

    try {
      await createUserWithEmailAndPassword(
        auth,
        authEmail.trim().toLowerCase(),
        authPassword
      );
      setToastMessage("Account created successfully");
      setAuthEmail("");
      setAuthPassword("");
    } catch (authError) {
      if (authError.code === "auth/email-already-in-use") {
        setAuthMessage("Account already exists. Please log in.");
        setAuthActionMode("login");
      } else {
        setAuthMessage(getFriendlyAuthMessage(authError));
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    setError("");
    setAuthMessage("");

    try {
      await signOut(auth);
      setLectureData(null);
      setProfileOpen(false);
      setUserProfile(null);
      setNeedsProfileSetup(false);
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

  function openAuthCard(mode) {
    setAuthMode(mode);
    setAuthMessage("");
    setAuthActionMode("");
    setProfileOpen(false);
    setAuthCardOpen(true);
  }

  function switchAuthMode(mode) {
    setAuthMode(mode);
    setAuthMessage("");
    setAuthActionMode("");
  }

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setUploadedAvatar(result);
      setSelectedAvatar("uploaded");
    };

    reader.readAsDataURL(file);
  }

  async function saveProfileSetup(event) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const username = setupUsername.trim() || "User";
    const avatar = selectedAvatar === "uploaded" ? uploadedAvatar : selectedAvatar;

    if (!avatar) {
      setAuthMessage("Please choose an avatar.");
      return;
    }

    setProfileSaving(true);
    setAuthMessage("");

    try {
      const profileData = {
        uid: user.uid,
        email: user.email || "",
        username,
        avatar,
        provider: getProviderName(user),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", user.uid), profileData);
      setUserProfile({
        uid: user.uid,
        email: user.email || "",
        username,
        avatar,
        provider: getProviderName(user),
      });
      setNeedsProfileSetup(false);
      setToastMessage("Profile saved");
      console.log("User profile created");
    } catch (profileError) {
      setAuthMessage(profileError.message || "Could not save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function renderAvatar(avatar, label, className = "profile-avatar") {
    const builtInAvatar = getAvatarOption(avatar);

    if (
      avatar?.startsWith("data:") ||
      avatar?.startsWith("http://") ||
      avatar?.startsWith("https://")
    ) {
      return <img src={avatar} alt={label} className={className} />;
    }

    if (builtInAvatar) {
      return (
        <span
          className={`${className} fallback-avatar`}
          style={{ background: builtInAvatar.gradient }}
        >
          {label.charAt(0).toUpperCase()}
        </span>
      );
    }

    return <span className={`${className} fallback-avatar`}>{userInitial}</span>;
  }

  const authPanel = !authReady ? null : user ? (
    <div className="profile-menu-wrap">
      <button
        className="profile-trigger"
        onClick={() => setProfileOpen((isOpen) => !isOpen)}
        type="button"
      >
        {renderAvatar(profileAvatar, userLabel)}
        <span>{userLabel}</span>
        <span className="profile-chevron">v</span>
      </button>

      {profileOpen && (
        <div className="profile-dropdown">
          <button type="button">Profile</button>
          <button type="button">History</button>
          <button type="button">Settings</button>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="auth-entry">
      <div className="auth-action-row">
        <button
          className={`auth-pill ${
            authMode === "login" && authCardOpen ? "active" : ""
          }`}
          onClick={() => openAuthCard("login")}
          type="button"
        >
          Log In
        </button>
        <button
          className={`auth-pill ${
            authMode === "signup" && authCardOpen ? "active" : ""
          }`}
          onClick={() => openAuthCard("signup")}
          type="button"
        >
          Sign Up
        </button>
      </div>

      {authCardOpen && (
        <div className="inline-auth-card">
          <div className="inline-auth-head">
            <strong>{authMode === "login" ? "Log In" : "Create account"}</strong>
            <button
              className="auth-close"
              onClick={() => setAuthCardOpen(false)}
              type="button"
              aria-label="Close auth card"
            >
              x
            </button>
          </div>

          <button
            className="google-button inline-google-button"
            onClick={handleGoogleSignIn}
            disabled={authSubmitting}
            type="button"
          >
            <span className="google-icon" aria-hidden="true">
              <span className="google-g">G</span>
            </span>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <form
            className="email-auth-form"
            onSubmit={authMode === "login" ? handleEmailLogin : handleEmailSignup}
          >
            <input
              type="email"
              value={authEmail}
              onChange={(event) => {
                setAuthEmail(event.target.value);
                setAuthMessage("");
                setAuthActionMode("");
              }}
              placeholder="Email"
              autoComplete="email"
              required
            />
            <input
              type="password"
              value={authPassword}
              onChange={(event) => {
                setAuthPassword(event.target.value);
                setAuthMessage("");
                setAuthActionMode("");
              }}
              placeholder="Password"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
              required
            />
            <div className="email-auth-actions">
              <button
                className="email-auth-button"
                type="submit"
                disabled={authSubmitting}
              >
                {authMode === "login" ? "Login" : "Create Account"}
              </button>
            </div>
          </form>

          <p className="auth-switch-copy">
            {authMode === "login" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchAuthMode(authMode === "login" ? "signup" : "login")}
            >
              {authMode === "login" ? "Create Account" : "Log In"}
            </button>
          </p>

          {authMessage && (
            <div className="inline-auth-message">
              <p>{authMessage}</p>
              {authActionMode && (
                <button type="button" onClick={() => switchAuthMode(authActionMode)}>
                  {authActionMode === "login" ? "Go to Login" : "Go to Sign Up"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <main className="app-shell">
      <div className="glow glow-blue"></div>
      <div className="glow glow-purple"></div>
      <div className="glow glow-cyan"></div>
      <div className="grid-overlay"></div>

      <nav className="site-nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <div className="brand-mark">AI</div>
            <div>
              <span>Lecture AI Tutor</span>
              <small>Coding lecture companion</small>
            </div>
          </div>

          <div className="auth-panel">{authPanel}</div>
        </div>
      </nav>

      <section className="hero-section">
        <div className="section-inner hero-inner">
          <p className="eyebrow">Personal coding lecture companion</p>
          <h1>Lecture AI Tutor</h1>
          <p className="hero-copy">
            Turn a YouTube coding lecture into a guided learning session with
            transcript-aware prompts, video context, and your custom GPT tutor.
          </p>
        </div>
      </section>

      <div className="page-content">
        {authMessage && !authCardOpen && (
          <div className="auth-message">{authMessage}</div>
        )}

        {user && needsProfileSetup && (
          <form className="profile-setup-card" onSubmit={saveProfileSetup}>
            <div className="profile-setup-copy">
              <p className="preview-label">First-time setup</p>
              <h2>Complete Your Profile</h2>
              <p>Pick how you want to appear inside Lecture AI Tutor.</p>
            </div>

            <label className="profile-setup-field" htmlFor="profile-username">
              Username
              <input
                id="profile-username"
                type="text"
                value={setupUsername}
                onChange={(event) => setSetupUsername(event.target.value)}
                placeholder="Choose a username"
                required
              />
            </label>

            <div className="avatar-picker">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  className={`avatar-option ${
                    selectedAvatar === avatar.id ? "selected" : ""
                  }`}
                  key={avatar.id}
                  onClick={() => {
                    setSelectedAvatar(avatar.id);
                    setUploadedAvatar("");
                  }}
                  type="button"
                  style={{ background: avatar.gradient }}
                  aria-label={`Choose ${avatar.label} avatar`}
                >
                  <span>{setupUsername.charAt(0).toUpperCase() || "U"}</span>
                </button>
              ))}

              <label
                className={`avatar-upload-option ${
                  selectedAvatar === "uploaded" ? "selected" : ""
                }`}
              >
                {uploadedAvatar ? (
                  <img src={uploadedAvatar} alt="Uploaded avatar preview" />
                ) : (
                  <span>Upload Image</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>

            <button
              className="profile-save-button"
              type="submit"
              disabled={profileSaving}
            >
              {profileSaving ? "Saving Profile..." : "Save Profile"}
            </button>
          </form>
        )}

        <section className="input-section section-shell">
          <div className="section-heading">
            <p className="preview-label">Start learning</p>
            <h2>Paste a lecture link</h2>
          </div>

          <div className="input-panel">
            <label htmlFor="youtube-url">YouTube lecture link</label>

            <div className="input-action-row">
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
                    Analyzing...
                  </span>
                ) : (
                  "Analyze Lecture"
                )}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        {metadataLoading && (
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
        )}

        {!metadataLoading && thumbnailUrl && (
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
        )}

        {loading && (
          <section className="results-section section-shell">
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
          </section>
        )}

        {lectureData && (
          <section className="results-section section-shell">
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
          </section>
        )}

        <footer className="site-footer">
          <span>Lecture AI Tutor</span>
          <p>Built for focused coding lecture study.</p>
        </footer>
      </div>

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

      {toastMessage && <div className="auth-toast">{toastMessage}</div>}
    </main>
  );
}

export default App;
