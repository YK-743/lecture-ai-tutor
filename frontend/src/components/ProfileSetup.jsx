function ProfileSetup({
  saveProfileSetup,
  setupUsername,
  setSetupUsername,
  avatarOptions,
  selectedAvatar,
  setSelectedAvatar,
  setUploadedAvatar,
  uploadedAvatar,
  handleAvatarUpload,
  profileSaving,
}) {
  return (
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
        {avatarOptions.map((avatar) => (
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
          <input type="file" accept="image/*" onChange={handleAvatarUpload} />
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
  );
}

export default ProfileSetup;
