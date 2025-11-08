/**
 * Form field wrapper component with label and error message
 */

import { Label, TextInput, Textarea, type TextInputProps } from "flowbite-react";
import { type ReactNode } from "react";

interface FormFieldProps extends Omit<TextInputProps, "type"> {
  label: string;
  name: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  type?: "text" | "email" | "password" | "url" | "number" | "date" | "time" | "datetime-local" | "textarea";
  rows?: number;
}

export function FormField({
  label,
  name,
  error,
  helpText,
  required,
  type = "text",
  rows = 4,
  ...props
}: FormFieldProps) {
  const inputId = `field-${name}`;

  return (
    <div className="mb-4">
      <div className="mb-2 block">
        <Label htmlFor={inputId}>{label}</Label>
        {required && <span className="ml-1 text-red-500">*</span>}
      </div>

      {type === "textarea" ? (
        <Textarea
          id={inputId}
          name={name}
          rows={rows}
          color={error ? "failure" : undefined}
          {...(props as any)}
        />
      ) : (
        <TextInput
          id={inputId}
          name={name}
          type={type}
          color={error ? "failure" : undefined}
          required={required}
          {...props}
        />
      )}
      
      {(error ?? helpText) && (
        <p className={`mt-2 text-sm ${error ? 'text-red-600 dark:text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {error ?? helpText}
        </p>
      )}
    </div>
  );
}

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400">
      {message}
    </div>
  );
}

interface FormSuccessProps {
  message?: string;
}

export function FormSuccess({ message }: FormSuccessProps) {
  if (!message) return null;

  return (
    <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-gray-800 dark:text-green-400">
      {message}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
