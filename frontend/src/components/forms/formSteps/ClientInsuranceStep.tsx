import { useFormContext } from "react-hook-form";
import InputField from "../inputs/InputField";
import RadioGroup from "../inputs/RadioGroup";

export default function ClientInsuranceStep() {
  const { watch } = useFormContext();

  // Watch the values of Medicare and Medicaid radio buttons
  const medicare = watch("medicare");
  const medicaid = watch("medicaid");
  return (
    <div className="space-y-3 w-full">
      {/* Client Automobile Insurance */}
      <p className="text-sm font-bold pb-1 text-gray-700 dark:text-gray-400">
        Client Automobile Insurance
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField name="autoName" label="Auto Insurance Carrier Name" />
        <InputField name="autoPhone" label="Phone" />
        <InputField name="autoAddress" label="Address" />
        {/* <InputField name="autoCarrier" label="Carrier" /> */}
        <InputField name="autoAgent" label="Agent" />
        <InputField name="autoPolicy" label="Policy #" />
        <InputField name="autoClaim" label="Claim #" />
        {/* <InputField name="autoAdjuster" label="Adjuster" />
        <InputField name="autoInsured" label="Insured" /> */}
      </div>
       {/* <TextareaField name="autoAdditionalinfo" label="Additional Info" /> */}

      {/* Client Health Insurance */}
      <p className="text-sm font-bold pb-1 pt-4 text-gray-700 dark:text-gray-400">
        Client Health Insurance
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField name="healthCarrier" label="Health Insurance Carrier Name" />
        <InputField name="healthPhone" label="Phone" />
        {/* <InputField
          name="healthType"
          label="Type of Health Insurance (PPO / HMO)"
        /> */}
        <InputField name="healthAddress" label="Address" />
        {/* <InputField name="healthGroup" label="Group #" /> */}
        <InputField name="healthAgent" label="Agent" />
        <InputField name="healthPolicy" label="Policy #" />
        <InputField name="healthClaim" label="Claim #" />

      </div>
      <InputField name="healthAdjuster" label="Adjuster" />

      {/* Medicare */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <RadioGroup name="medicare" label="Medicare" options={["Yes", "No"]} />
        </div>
        {medicare === "Yes" && (
        <InputField
          name="medicareNumber"
          label="Medicare #"
          placeholder="Enter Medicare number"
        />
      )}

      </div>

      {/* Medicaid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <RadioGroup name="medicaid" label="Medicaid" options={["Yes", "No"]} />
        </div>
        {medicaid === "Yes" && (
        <InputField name="medicaidNumber" label="Medicaid #" />
        )}
      </div>
      {/* <TextareaField name="healthAdditionalinfo" label="Additional Info" /> */}
    </div>
  );
}
