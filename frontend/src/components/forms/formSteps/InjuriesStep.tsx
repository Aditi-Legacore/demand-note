import InputField from "../inputs/InputField";
import TextareaField from "../inputs/TextareaField";

export default function InjuriesStep() {
  return (
    <div className="space-y-3 w-full">
      <TextareaField
        name="bodyPartsAffected"
        label="Describe all parts of the body affected by this accident"
      />

      <TextareaField
        name="priorInjuries"
        label="Describe any prior injuries"
      />

      <InputField
        name="priorInsuranceClaims"
        label="Prior Insurance Claims"
      />

      <InputField
        name="priorAttorneys"
        label="Prior Attorneys for PI or WC Injuries"
      />
    </div>
  );
}
