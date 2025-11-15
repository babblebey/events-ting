"use client";

/**
 * ImportWizard Component
 * Multi-step wizard for importing attendees from CSV
 */

import { useState } from "react";
import { Card } from "flowbite-react";
import { FileUploadStep } from "./file-upload-step";
import { FieldMappingStep } from "./field-mapping-step";
import { ValidationStep } from "./validation-step";
import { ImportProgressStep } from "./import-progress-step";

interface ImportWizardProps {
  eventId: string;
  eventName: string;
}

export type ParsedCSVData = {
  columns: string[];
  preview: Record<string, string>[];
  totalRows: number;
  fileContent: string; // Store original file content
};

export type ValidationResult = {
  validRows: number;
  invalidRows: number;
  duplicates: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
};

export type ImportResult = {
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
  status: "completed" | "failed" | string; // Allow string for compatibility
  errorMessage?: string;
};

type WizardStep = "upload" | "mapping" | "validation" | "import";

export function ImportWizard({ eventId, eventName }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<
    "skip" | "create"
  >("skip");
  const [sendConfirmationEmails, setSendConfirmationEmails] = useState(false);

  const handleUploadComplete = (
    data: ParsedCSVData,
    sendEmails: boolean,
    suggestedMapping: Record<string, string>
  ) => {
    setParsedData(data);
    setSendConfirmationEmails(sendEmails);
    setFieldMapping(suggestedMapping);
    setCurrentStep("mapping");
  };

  const handleMappingComplete = (mapping: Record<string, string>) => {
    setFieldMapping(mapping);
    setCurrentStep("validation");
  };

  const handleValidationComplete = (
    result: ValidationResult,
    strategy: "skip" | "create"
  ) => {
    setValidationResult(result);
    setDuplicateStrategy(strategy);
    setCurrentStep("import");
  };

  const handleBackFromMapping = () => {
    setCurrentStep("upload");
  };

  const handleBackFromValidation = () => {
    setCurrentStep("mapping");
  };

  const handleImportComplete = () => {
    // Reset wizard or navigate away
    // This will be handled by the ImportProgressStep
  };

  const getStepNumber = (): number => {
    switch (currentStep) {
      case "upload":
        return 1;
      case "mapping":
        return 2;
      case "validation":
        return 3;
      case "import":
        return 4;
      default:
        return 1;
    }
  };

  return (
    <Card className="w-full">
      <div className="space-y-6">
        {/* Step indicator */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Import Attendees
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">
              Step {getStepNumber()} of 4:
            </span>
            <span>
              {currentStep === "upload" && "Upload CSV File"}
              {currentStep === "mapping" && "Map CSV Fields"}
              {currentStep === "validation" && "Validate Data"}
              {currentStep === "import" && "Import Progress"}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(getStepNumber() / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        {currentStep === "upload" && (
          <FileUploadStep
            eventId={eventId}
            eventName={eventName}
            onComplete={handleUploadComplete}
          />
        )}

        {currentStep === "mapping" && parsedData && (
          <FieldMappingStep
            eventId={eventId}
            parsedData={parsedData}
            initialMapping={fieldMapping}
            onComplete={handleMappingComplete}
            onBack={handleBackFromMapping}
          />
        )}

        {currentStep === "validation" && parsedData && (
          <ValidationStep
            eventId={eventId}
            parsedData={parsedData}
            fieldMapping={fieldMapping}
            onComplete={handleValidationComplete}
            onBack={handleBackFromValidation}
          />
        )}

        {currentStep === "import" && parsedData && validationResult && (
          <ImportProgressStep
            eventId={eventId}
            eventName={eventName}
            parsedData={parsedData}
            fieldMapping={fieldMapping}
            duplicateStrategy={duplicateStrategy}
            sendConfirmationEmails={sendConfirmationEmails}
            validationResult={validationResult}
            onComplete={handleImportComplete}
          />
        )}
      </div>
    </Card>
  );
}
