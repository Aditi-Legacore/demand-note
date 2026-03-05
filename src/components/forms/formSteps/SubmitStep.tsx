"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";

interface SubmitStepProps {
  isSubmitting?: boolean;
}

export default function SubmitStep({ isSubmitting = false }: SubmitStepProps) {
  const [consent, setConsent] = useState(false);
  const { getValues, setValue, register, watch } = useFormContext(); // 🧠 get all form values from wizard

  const hearAboutUs = watch("hearAboutUs");

  const options = [
    { value: "Internet", label: "Internet" },
    { value: "Former Client", label: "Former Client" },
    { value: "Referred by Friend", label: "Referred by Friend" },
    { value: "Referred by Attorney", label: "Referred by Attorney" },
    { value: "Billboard", label: "Billboard" },
    { value: "Others", label: "Others" },
  ];

  // 📄 Generate PDF Preview
  const handlePreview = () => {
    const values = getValues(); // get all fields from previous steps too
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Form Preview", 10, 15);

    let y = 30;
    Object.entries(values).forEach(([key, value]) => {
      doc.text(`${key}: ${value ?? ""}`, 10, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // open in new tab
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl);
  };

  return (
    <div className="space-y-3 w-full">
      {/* Radio Section */}
      <div>
        <h6 className="text-xs font-normal text-gray-500 dark:text-gray-400 mb-2">
          How did you hear about us?
        </h6>
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="radio"
                {...register("hearAboutUs")}
                value={opt.value}
                checked={hearAboutUs === opt.value}
                onChange={(e) => {
                  setValue("hearAboutUs", e.target.value);
                }}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {hearAboutUs && (
          <div className="mt-3">
            <input
              type="text"
              placeholder={`Please specify ${hearAboutUs}`}
              {...register("hearAboutUsDetail")}
              onChange={(e) => setValue("hearAboutUsDetail", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300 dark:bg-gray-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Preview PDF Button */}
      <div className="text-right">
        <button
          type="button"
          onClick={handlePreview}
          className="text-gray-500 dark:text-gray-400 hover:underline font-normal text-xs"
        >
          Preview the form
        </button>
      </div>

      {/* Consent Checkbox */}
      <div className="flex items-start space-x-2 text-left">
        <input
          type="checkbox"
          id="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor="consent"
          className="text-gray-500 dark:text-gray-400 text-xs text-left"
        >
          I hereby confirm that all the information I have provided is true and correct to the best of my knowledge.
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
  <Button
    type="submit"
    disabled={!consent || isSubmitting}
    className={`py-3 rounded-lg text-xs font-normal transition ${
      consent && !isSubmitting
        ? "bg-green-600 text-white hover:bg-green-700"
        : "bg-gray-400 text-gray-700 cursor-not-allowed"
    }`}
    onClick={(e) => {
      console.log("Button clicked");
      if (!consent || isSubmitting) {
        e.preventDefault();
        console.log("Button disabled, preventing submit");
      }
    }}
  >
    {isSubmitting ? "Submitting..." : "Submit Form"}
  </Button>
</div>

    </div>
  );
}
