function SuccessCard({ lectureData, openTutor }) {
  return (
    <section className="results-section section-shell">
      <div className="success-card">
        <div>
          <p className="success-kicker">Ready</p>
          <h2>Lecture ready for learning</h2>
          <p>
            Your transcript prompt is prepared. The next click copies it, shows
            your instructions, and then opens your custom GPT.
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
  );
}

export default SuccessCard;
