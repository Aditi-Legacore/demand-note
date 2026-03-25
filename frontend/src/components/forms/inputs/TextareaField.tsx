import { useFormContext, FieldError } from "react-hook-form";

interface TextareaProps {
  name: string;
  label: string;
}

export default function TextareaField({ name, label }: TextareaProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldError = errors[name] as FieldError | undefined;
  const labelParts = label.split("*");

  return (
    <div>
      <label className="block text-xs font-normal text-gray-500 dark:text-gray-400 mb-1">
        {labelParts.map((part, index) => (
          <span key={`${name}-label-${index}`}>
            {part}
            {index < labelParts.length - 1 && (
              <span className="text-red-700 dark:text-red-400">*</span>
            )}
          </span>
        ))}
      </label>
      <textarea
        {...register(name)}
        rows={3}
        className="
          w-full rounded-md border px-2 py-1.5 transition text-sm
          text-gray-800 dark:text-gray-100
          bg-white dark:bg-gray-900
          border-gray-300 dark:border-gray-600
          focus:outline-none focus:ring-2
          focus:ring-indigo-500 dark:focus:ring-indigo-400
          placeholder-gray-400 dark:placeholder-gray-500
        "
      ></textarea>
      {fieldError && (
        <p className="text-red-500 text-sm mt-1">{fieldError.message}</p>
      )}
    </div>
  );
}
