export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props) {
  return <input {...props} />;
}

export function SelectInput({ children, ...props }) {
  return <select {...props}>{children}</select>;
}

export function TextArea(props) {
  return <textarea rows="3" {...props} />;
}
