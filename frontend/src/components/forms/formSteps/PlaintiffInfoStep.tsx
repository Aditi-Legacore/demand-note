import DateInputField from "../inputs/DateInputField";
import InputField from "../inputs/InputField";
import RadioGroup from "../inputs/RadioGroup";

export default function PlaintiffInfoStep() {
  return (
    <div className="space-y-1 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField name="clientName" label="Client Name *" />
        <InputField name="phone" label="Phone *" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DateInputField name="dob" label="Date of Birth" />
        <RadioGroup name="gender" label="Gender *" options={["Male", "Female"]} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField name="email" label="Email *" type="email" />
        <InputField name="address" label="Address" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField name="city" label="City" />
        <InputField name="zip" label="Zip" />
      </div>
      <InputField name="ssn" label="Social Security Number(SSN)" />
    </div>
  );
}
