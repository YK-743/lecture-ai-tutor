function Loader({ loadingSteps, loadingStep }) {
  return (
    <section className="results-section section-shell">
      <div className="premium-loader">
        <div className="loader-header">
          <div className="loader-orbit">
            <span></span>
            <span></span>
          </div>

          <div>
            <p>{loadingSteps[loadingStep]}</p>
            <small>Building your guided learning session</small>
          </div>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
            }}
          ></div>
        </div>

        <div className="step-list">
          {loadingSteps.map((step, index) => (
            <div
              className={`step-item ${index === loadingStep ? "active" : ""} ${
                index < loadingStep ? "complete" : ""
              }`}
              key={step}
            >
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Loader;
