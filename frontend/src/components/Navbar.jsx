import AuthPanel from "./AuthPanel";

function Navbar({
  authReady,
  user,
  userLabel,
  profileAvatar,
  profileOpen,
  setProfileOpen,
  handleLogout,
  renderAvatar,
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
    <AuthPanel
      authMode={authMode}
      authCardOpen={authCardOpen}
      openAuthCard={openAuthCard}
      closeAuthCard={closeAuthCard}
      handleGoogleSignIn={handleGoogleSignIn}
      authSubmitting={authSubmitting}
      handleEmailLogin={handleEmailLogin}
      handleEmailSignup={handleEmailSignup}
      authEmail={authEmail}
      setAuthEmail={setAuthEmail}
      authPassword={authPassword}
      setAuthPassword={setAuthPassword}
      setAuthMessage={setAuthMessage}
      setAuthActionMode={setAuthActionMode}
      switchAuthMode={switchAuthMode}
      authMessage={authMessage}
      authActionMode={authActionMode}
    />
  );

  return (
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
  );
}

export default Navbar;
