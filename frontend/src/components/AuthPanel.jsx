function AuthPanel({
  authMode,
  authCardOpen,
  openAuthCard,
  closeAuthCard,
  handleGoogleSignIn,
  authSubmitting,
  handleEmailLogin,
  handleEmailSignup,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  setAuthMessage,
  setAuthActionMode,
  switchAuthMode,
  authMessage,
  authActionMode,
}) {
  return (
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
              onClick={closeAuthCard}
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
}

export default AuthPanel;
