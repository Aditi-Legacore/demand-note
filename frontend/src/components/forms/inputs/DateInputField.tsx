import { useFormContext, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DateInputField({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const { control, setValue } = useFormContext();
  const labelParts = label.split("*");

  return (
    <div className="flex flex-col space-y-1">
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
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <DatePicker
            selected={field.value ? new Date(field.value) : null}
            onChange={(date) =>
              setValue(name, date ? date.toISOString() : "")
            }
            dateFormat="MM/dd/yyyy"
            placeholderText="mm/dd/yyyy"
            className="
              w-full rounded-md border px-2 py-1.5 transition text-sm
              text-gray-800 dark:text-gray-100
              bg-white dark:bg-gray-900
              border-gray-300 dark:border-gray-600
              focus:outline-none focus:ring-2
              focus:ring-indigo-500 dark:focus:ring-indigo-400
            "
            maxDate={new Date()}
          />
        )}
      />
    </div>
  );
}
