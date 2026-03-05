"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import InputField from "../inputs/InputField";
import TextareaField from "../inputs/TextareaField";

// Dropdown Component
interface SelectFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Select...",
}: SelectFieldProps) {
  return (
    <div className="flex flex-col">
      <label
        htmlFor={name}
        className="text-xs font-normal text-gray-500 dark:text-gray-400 mb-1"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

interface DefendantVehicle {
  year: string;
  make: string;
  model: string;
}
interface NHTSAYear {
  modelYear: string;
}

interface NHTSAMake {
  makeName?: string;
  make?: string;
}

interface NHTSAModel {
  modelName?: string;
  model?: string;
}


export default function DefendantInfoStep() {
  const { setValue, watch } = useFormContext();
  const [defendantCount, setDefendantCount] = useState(1);

  // Vehicle data for each defendant
  const [defendantVehicles, setDefendantVehicles] = useState<DefendantVehicle[]>([
    { year: "", make: "", model: "" },
  ]);

  // API data
  const [years, setYears] = useState<string[]>([]);
  const [makesData, setMakesData] = useState<Record<number, string[]>>({});
  const [modelsData, setModelsData] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  // Initialize local state from form values on mount
  useEffect(() => {
    const initializeVehicles = () => {
      const vehicles: DefendantVehicle[] = [];
      for (let i = 0; i < defendantCount; i++) {
        const year = watch(`defendant${i + 1}Year`) || "";
        const make = watch(`defendant${i + 1}Make`) || "";
        const model = watch(`defendant${i + 1}Model`) || "";
        vehicles.push({ year, make, model });
      }
      setDefendantVehicles(vehicles);
    };
    initializeVehicles();
  }, [defendantCount, watch]);

  // Fetch all years on mount
  useEffect(() => {
    fetch("https://api.nhtsa.gov/products/vehicle/modelYears?issueType=c")
      .then((res) => res.json())
      .then((data) => {
      const yearObjects: NHTSAYear[] = data.results;
      const extractedYears = yearObjects.map((item) => item.modelYear || "");
      
      const sortedYears = extractedYears.sort((a, b) => {
        const yearA = parseInt(a);
        const yearB = parseInt(b);
        return yearB - yearA;
      });

      setYears(sortedYears.map(String));
    })

      .catch((err) => console.error("Error fetching years:", err));
  }, []);

  // Fetch makes when year changes for a specific defendant
  const fetchMakes = async (index: number, year: string) => {
    if (!year) return;

    setLoading((prev) => ({ ...prev, [index]: true }));

    try {
      const response = await fetch(
        `https://api.nhtsa.gov/products/vehicle/makes?modelYear=${year}&issueType=c`
      );
      const data = await response.json();

      // Map objects to extract make names
      const makesList = (data.results as NHTSAMake[]).map(
      (item) => item.makeName || item.make || ""
    );


      setMakesData((prev) => ({ ...prev, [index]: makesList }));

      // Clear make and model when year changes
      setDefendantVehicles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], make: "", model: "" };
        return updated;
      });

      // Clear models for this defendant
      setModelsData((prev) => ({ ...prev, [index]: [] }));
    } catch (err) {
      console.error("Error fetching makes:", err);
    } finally {
      setLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Fetch models when both year and make are selected
  const fetchModels = async (index: number, year: string, make: string) => {
    if (!year || !make) return;

    setLoading((prev) => ({ ...prev, [index]: true }));

    try {
      const response = await fetch(
        `https://api.nhtsa.gov/products/vehicle/models?modelYear=${year}&make=${make}&issueType=c`
      );
      const data = await response.json();

      // Map objects to extract model names
      // const modelsList = data.results.map((item: any) => item.modelName || item.model || item);
      const modelsList = (data.results as NHTSAModel[]).map(
        (item) => item.modelName || item.model || ""
      );


      setModelsData((prev) => ({ ...prev, [index]: modelsList }));

      // Clear model when make changes
      setDefendantVehicles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], model: "" };
        return updated;
      });
    } catch (err) {
      console.error("Error fetching models:", err);
    } finally {
      setLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Handle year change
  const handleYearChange = (index: number, year: string) => {
    setDefendantVehicles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], year };
      return updated;
    });
    setValue(`defendant${index + 1}Year`, year);
    setValue(`defendant${index + 1}Make`, "");
    setValue(`defendant${index + 1}Model`, "");

    fetchMakes(index, year);
  };

  // Handle make change
  const handleMakeChange = (index: number, make: string) => {
    setDefendantVehicles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], make };
      return updated;
    });
    setValue(`defendant${index + 1}Make`, make);
    setValue(`defendant${index + 1}Model`, "");

    const year = defendantVehicles[index]?.year;
    if (year) {
      fetchModels(index, year, make);
    }
  };

  // Handle model change
  const handleModelChange = (index: number, model: string) => {
    setDefendantVehicles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], model };
      return updated;
    });
    setValue(`defendant${index + 1}Model`, model);
  };

  const handleAddDefendant = () => {
    setDefendantCount((prev) => prev + 1);
    setDefendantVehicles((prev) => [...prev, { year: "", make: "", model: "" }]);
  };

  const handleRemoveDefendant = (indexToRemove: number) => {
    setDefendantCount((prev) => prev - 1);
    setDefendantVehicles((prev) => prev.filter((_, i) => i !== indexToRemove));

    // Clear form values for removed defendant
    setValue(`defendant${indexToRemove + 1}Year`, "");
    setValue(`defendant${indexToRemove + 1}Make`, "");
    setValue(`defendant${indexToRemove + 1}Model`, "");

    // Clean up cached data for removed defendant
    setMakesData((prev) => {
      const updated = { ...prev };
      delete updated[indexToRemove];
      return updated;
    });
    setModelsData((prev) => {
      const updated = { ...prev };
      delete updated[indexToRemove];
      return updated;
    });
  };

  return (
    <div className="space-y-3 w-full">
      {[...Array(defendantCount)].map((_, index) => (
        <div
          key={index}
          className="p-3 rounded-xl dark:bg-gray-900 space-y-3 relative"
        >
          {/* Header with remove button */}
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
              Defendant #{index + 1}
            </p>

            {/* Show remove button only if more than one defendant */}
            {defendantCount > 1 && index === defendantCount - 1 && (
              <button
                type="button"
                onClick={() => handleRemoveDefendant(index)}
                className="text-red-500 hover:text-red-600 text-xs font-normal"
              >
                ✖ Remove
              </button>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField name={`defendant${index + 1}Name`} label="Name *" />
            <InputField name={`defendant${index + 1}Address`} label="Address" />
            <InputField
              name={`defendant${index + 1}Carrier`}
              label="Insurance Carrier Name"
            />
            <InputField
              name={`defendant${index + 1}CarrierPhone`}
              label="Insurance Carrier Phone No"
            />
          </div>

          {/* Vehicle Info with Dropdowns */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SelectField
                name={`defendant${index + 1}Year`}
                label="Year"
                value={defendantVehicles[index]?.year || ""}
                onChange={(value) => handleYearChange(index, value)}
                options={years}
                placeholder="Select Year"
              />

              <SelectField
                name={`defendant${index + 1}Make`}
                label="Make"
                value={defendantVehicles[index]?.make || ""}
                onChange={(value) => handleMakeChange(index, value)}
                options={makesData[index] || []}
                disabled={!defendantVehicles[index]?.year || loading[index]}
                placeholder={
                  loading[index]
                    ? "Loading..."
                    : !defendantVehicles[index]?.year
                    ? "Select Year First"
                    : "Select Make"
                }
              />

              <SelectField
                name={`defendant${index + 1}Model`}
                label="Model"
                value={defendantVehicles[index]?.model || ""}
                onChange={(value) => handleModelChange(index, value)}
                options={modelsData[index] || []}
                disabled={
                  !defendantVehicles[index]?.year ||
                  !defendantVehicles[index]?.make ||
                  loading[index]
                }
                placeholder={
                  loading[index]
                    ? "Loading..."
                    : !defendantVehicles[index]?.year
                    ? "Select Year First"
                    : !defendantVehicles[index]?.make
                    ? "Select Make First"
                    : "Select Model"
                }
              />
            </div>
          </div>

          <TextareaField
            name={`defendant${index + 1}Damage`}
            label="Damage"
          />
        </div>
      ))}

      {/* Add More Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleAddDefendant}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add More Defendant
        </button>
      </div>
    </div>
  );
}
