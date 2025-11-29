interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({
  fullScreen = false,
  size = "md",
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-10 w-10 border-t-2 border-b-2",
    lg: "h-16 w-16 border-t-3 border-b-3",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-blue-500`}
      ></div>
      {text && <p className="mt-3 text-sm text-gray-400">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
