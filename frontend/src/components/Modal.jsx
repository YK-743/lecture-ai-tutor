function Modal({ customModalText, closeModal, continueLearning }) {
  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-icon">âœ“</div>
        <h2>Prompt copied</h2>
        <p>Paste it in Lecture AI Tutor.</p>

        <div className="modal-instructions">
          {customModalText.split("\n").map((line, index) => (
            <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
          ))}
        </div>

        <button className="modal-button" onClick={continueLearning}>
          Continue Learning
        </button>
      </div>
    </div>
  );
}

export default Modal;
