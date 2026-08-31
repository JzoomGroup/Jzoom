import {
  AlignLeft,
  AtSign,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  FileUp,
  Hash,
  Info,
  Link,
  ListChecks,
  ListFilter,
  Phone,
  TextCursorInput,
  type LucideIcon,
} from "lucide-react";
import type { RequestTemplateFieldType } from "../../lib/request-template-types";

export const fieldTypeLabels: Record<RequestTemplateFieldType, string> = {
  NOTE: "ملاحظة إرشادية",
  SHORT_TEXT: "نص قصير",
  LONG_TEXT: "نص طويل",
  NUMBER: "رقم",
  DATE: "تاريخ",
  DROPDOWN: "قائمة اختيار",
  MULTI_SELECT: "اختيار متعدد",
  CHECKBOX: "نعم أو لا",
  RADIO: "اختيار واحد",
  FILE: "رفع مستند",
  EMAIL: "بريد إلكتروني",
  PHONE: "رقم جوال",
  AMOUNT: "مبلغ",
  URL: "رابط",
};

export const reusableFieldTypes: RequestTemplateFieldType[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "AMOUNT",
  "DATE",
  "DROPDOWN",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
  "EMAIL",
  "PHONE",
  "URL",
  "FILE",
];

export const quickFieldTypes: RequestTemplateFieldType[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "FILE",
  "NOTE",
];

const icons: Record<RequestTemplateFieldType, LucideIcon> = {
  NOTE: Info,
  SHORT_TEXT: TextCursorInput,
  LONG_TEXT: AlignLeft,
  NUMBER: Hash,
  DATE: CalendarDays,
  DROPDOWN: ListFilter,
  MULTI_SELECT: ListChecks,
  CHECKBOX: CheckSquare,
  RADIO: ListChecks,
  FILE: FileUp,
  EMAIL: AtSign,
  PHONE: Phone,
  AMOUNT: CircleDollarSign,
  URL: Link,
};

export function FieldTypeIcon({
  type,
  size = 18,
}: {
  size?: number;
  type: RequestTemplateFieldType;
}) {
  const Icon = icons[type];
  return <Icon aria-hidden="true" size={size} />;
}
