type QuestionFieldProps = {
  fieldId: string;
  name?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onVoiceToggle?: () => void;
  isRecording?: boolean;
  helperText?: string;
};

export function QuestionField({
  fieldId,
  name,
  label,
  placeholder,
  value,
  onChange,
  onVoiceToggle,
  isRecording = false,
  helperText,
}: QuestionFieldProps) {
  return (
    <div className="space-y-3 rounded-[22px] bg-card-strong p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor={fieldId} className="text-base font-semibold text-foreground">
          {label}
        </label>
        {onVoiceToggle !== undefined ? (
          <button
            type="button"
            onClick={onVoiceToggle}
            className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-medium ${
              isRecording
                ? "border-accent bg-accent text-white"
                : "border-border text-muted hover:bg-white"
            }`}
          >
            {isRecording ? "停止录音" : "语音输入"}
          </button>
        ) : null}
      </div>
      <textarea
        id={fieldId}
        name={name ?? fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[132px] w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm leading-7 text-foreground shadow-[inset_0_1px_3px_rgba(71,52,41,0.06)] focus:border-accent"
      />
      {helperText ? (
        <p className="text-xs leading-6 text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
