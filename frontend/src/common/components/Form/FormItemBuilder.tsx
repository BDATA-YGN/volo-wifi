"use client";

import React from "react";
import { Form, Input, InputNumber, Select, DatePicker, Radio, TimePicker, Button } from "antd";
import { FormItemProps as AntdFormItemProps } from "antd/lib/form";
import { Rule } from "antd/lib/form";
import TextArea from "antd/es/input/TextArea";
import TheIcon, { Name } from "../@bdata/IconPicker/icons";
import BButton from "../@bdata/AppButton";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { v4 as uuid} from "uuid";
dayjs.extend(utc);
dayjs.extend(timezone);

interface CommonFormItemProps {
  label?: string | React.ReactNode;
  name: string;
  rules?: Rule[];
  placeholder?: string;
  required?: boolean;
  inputType?:
    | "text"
    | "textArea"
    | "number"
    | "select"
    | "date"
    | "time"
    | "password"
    | "multiSelect"
    | "image"
    | "boolean"
    | "url"
    | "button"
    | "bbutton"
    | "color";
  options?: { label: string; value: string | number }[];
  className?: string;
  extra?: React.ReactNode;
  autoComplete?: string;
  readOnly?: boolean;
  defaultImageUrl?: string;
  hidden?: boolean;
  icon?: React.ReactNode | string;
  onChange?: (value: any) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  switchProps?: any;
  dependencies?: string[];
  formItemProps?: Partial<AntdFormItemProps>;
}

const FormItemBuilder = ({
  label,
  name,
  rules,
  placeholder,
  required = false,
  inputType = "text",
  options = [],
  className,
  extra,
  autoComplete,
  readOnly = false,
  defaultImageUrl,
  hidden,
  icon,
  onChange = () => {},
  onKeyDown,
  onPaste,
  switchProps = {},
  dependencies,
  formItemProps = {},
}: CommonFormItemProps) => {
  // Base rules for required fields
  const baseRules = required
    ? [{ required: true, message: `${label || name} is required` }]
    : [];

  // Custom validator for DatePicker to handle dayjs objects
  const dateValidator = (_: any, value: Dayjs | null) => {
    if (required && !value) {
      return Promise.reject(new Error(`${label || name} is required`));
    }
    if (value && !dayjs.isDayjs(value)) {
      return Promise.reject(new Error(`Invalid date format for ${label || name}`));
    }
    return Promise.resolve();
  };

  // Merge baseRules with custom rules, adding dateValidator for DatePicker
  const combinedRules = rules
    ? inputType === "date"
      ? [...baseRules, ...rules, { validator: dateValidator }]
      : [...baseRules, ...rules]
    : inputType === "date"
      ? [...baseRules, { validator: dateValidator }]
      : baseRules;

  // Default className logic
  const defaultClasses = "grid grid-cols-1";
  const finalClassName = className ? `${defaultClasses} ${className}` : defaultClasses;

  // Icon rendering for label
  const titleIcon =
    typeof icon === "string" ? (
      <span>
        <TheIcon name={icon as Name} /> {label}
      </span>
    ) : (
      <>
        {icon} {label}
      </>
    );

  // Handle DatePicker value to prevent null issues
  const handleDateChange = (date: Dayjs | null, dateString: string | null) => {
    onChange(date ? date : null); // Pass null or valid Dayjs object
  };

  return (
    <Form.Item
      label={titleIcon}
      name={name}
      rules={combinedRules}
      extra={extra}
      initialValue={inputType === "boolean" ? false : inputType === "date" ? null : undefined}
      hidden={hidden}
      dependencies={dependencies}
      {...formItemProps}
    >
      {inputType === "text" && (
        <Input
          placeholder={placeholder || `Enter ${label || name}`}
          className={finalClassName}
          autoComplete={autoComplete || "username"}
          readOnly={readOnly}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      )}
      {inputType === "password" && (
        <Input.Password
          placeholder={placeholder || `Enter ${label || name}`}
          autoComplete={autoComplete || "new-password"}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      )}
      {inputType === "number" && (
        <InputNumber
          placeholder={placeholder || `Enter ${label || name}`}
          className={finalClassName}
          style={{ width: "100%" }}
          readOnly={readOnly}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      )}
      {inputType === "select" && (
        <Select
          placeholder={placeholder || `Select ${label || name}`}
          className={finalClassName}
          disabled={readOnly}
          onChange={onChange}
          labelInValue={false}
        >
          {options.map((option) => (
            <Select.Option key={uuid()} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      )}
      {inputType === "multiSelect" && (
        <Select
          mode="multiple"
          placeholder={placeholder || `Select ${label || name}`}
          className={finalClassName}
          disabled={readOnly}
          onChange={onChange}
        >
          {options.map((option) => (
            <Select.Option key={uuid()} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      )}
      {inputType === "date" && (
        <DatePicker
          placeholder={placeholder || `Select ${label || name}`}
          className={finalClassName}
          style={{ width: "100%" }}
          disabled={readOnly}
          onChange={handleDateChange}
          format="YYYY-MM-DD"
          value={null} // Explicitly allow null to avoid invalid values
        />
      )}
      {inputType === "time" && (
        <TimePicker
          placeholder={placeholder || `Select ${label || name}`}
          className={finalClassName}
          style={{ width: "100%" }}
          disabled={readOnly}
          format="h:mm a"
          use12Hours={true}
          onChange={onChange}
        />
      )}
      {inputType === "textArea" && (
        <TextArea
          placeholder={placeholder || `Enter ${label || name}`}
          className={finalClassName}
          readOnly={readOnly}
          onChange={onChange}
          rows={2}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      )}
      {inputType === "image" && (
        <div>
          {defaultImageUrl ? (
            <img
              src={defaultImageUrl}
              alt="Image"
              style={{ maxWidth: "100%", maxHeight: "200px" }}
            />
          ) : (
            <p>No image available</p>
          )}
          {!readOnly && <Input type="file" accept="image/*" onChange={onChange} />}
        </div>
      )}
      {inputType === "boolean" && (
        <Radio.Group disabled={readOnly} onChange={onChange}>
          <Radio value={false}>False</Radio>
          <Radio value={true}>True</Radio>
        </Radio.Group>
      )}
      {inputType === "url" && (
        <Input
          type="url"
          placeholder={placeholder || `Enter ${label || name} URL`}
          className={finalClassName}
          readOnly={readOnly}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      )}
      {inputType === "color" && (
        <Input
          type="color"
          placeholder={placeholder || `Select ${label || name} color`}
          className={finalClassName}
          readOnly={readOnly}
          onChange={onChange}
          style={{ height: '40px', cursor: readOnly ? 'not-allowed' : 'pointer' }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      )}
      {inputType === "button" && (
        <Button
          type="default"
          className={finalClassName}
          style={{ width: "100%" }}
          onClick={onChange}
          disabled={readOnly}
        >
          {label}
        </Button>
      )}
      {inputType === "bbutton" && (
        <BButton
          color="default"
          variant="dashed"
          buttonKey={name}
          className={finalClassName}
          style={{ width: "100%" }}
          onClick={onChange}
          disabled={readOnly}
        >
          {label}
        </BButton>
      )}
    </Form.Item>
  );
};

export default FormItemBuilder;