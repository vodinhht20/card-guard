import { useLocale } from "./Locale";
import {
  Children,
  isValidElement,
  type ReactNode,
  type ChangeEvent,
} from "react";
import {
  Select as AriaSelect,
  SelectValue,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  DatePicker as AriaDatePicker,
  Group,
  DateInput,
  DateSegment,
  Dialog,
  Calendar,
  CalendarGrid,
  CalendarCell,
  Heading,
} from "react-aria-components";
import { parseDate } from "@internationalized/date";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
type LabelProps = {
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
};
function optionText(value: ReactNode): string {
  return Children.toArray(value)
    .map((v) =>
      typeof v === "string" || typeof v === "number"
        ? String(v)
        : isValidElement<{ children?: ReactNode }>(v)
          ? optionText(v.props.children)
          : "",
    )
    .join("");
}
export function Select({
  children,
  value,
  onChange,
  disabled,
  required,
  className,
  autoFocus,
  ...labels
}: LabelProps & {
  children: ReactNode;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  autoFocus?: boolean;
}) {
  const options = Children.toArray(children)
    .filter(isValidElement<{ value?: string; children?: ReactNode }>)
    .map((el) => ({
      id: el.props.value ?? optionText(el.props.children),
      label: optionText(el.props.children),
    }));
  return (
    <AriaSelect
      {...labels}
      className={`custom-select ${className ?? ""}`}
      selectedKey={value || "__empty"}
      onSelectionChange={(key) =>
        onChange({
          target: { value: key === "__empty" ? "" : String(key) },
        } as ChangeEvent<HTMLSelectElement>)
      }
      isDisabled={disabled}
      isRequired={required}
    >
      <Button className="select-trigger" autoFocus={autoFocus}>
        <SelectValue />
        <ChevronDown size={16} />
      </Button>
      <Popover className="control-popover" placement="bottom start" shouldFlip>
        <ListBox
          className="select-options"
          shouldSelectOnPressUp={false}
          items={options.map((o) => ({ ...o, id: o.id || "__empty" }))}
        >
          {(item) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className="select-option"
            >
              {({ isSelected }) => (
                <>
                  {item.label}
                  {isSelected && <Check size={15} />}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
export function DatePicker({
  value,
  onChange,
  required,
  ...labels
}: LabelProps & {
  value: string | null;
  onChange: (value: string | null) => void;
  required?: boolean;
}) {
  const { t } = useLocale();
  return (
    <AriaDatePicker
      {...labels}
      className="custom-date"
      value={value ? parseDate(value) : null}
      onChange={(date) => onChange(date?.toString() ?? null)}
      minValue={parseDate("2000-01-01")}
      maxValue={parseDate("2100-12-31")}
      isRequired={required}
      granularity="day"
      validationBehavior="aria"
    >
      <Group className="date-trigger">
        <DateInput className="date-input">
          {(segment) => (
            <DateSegment segment={segment} className="date-segment" />
          )}
        </DateInput>
        {value && (
          <Button
            slot={null}
            className="date-clear"
            aria-label={t("Xóa ngày")}
            onPress={() => onChange(null)}
          >
            <X size={14} />
          </Button>
        )}
        <Button className="calendar-open" aria-label={t("Mở lịch")}>
          <CalendarDays size={19} />
        </Button>
      </Group>
      <Popover
        className="control-popover calendar-popover"
        placement="bottom start"
      >
        <Dialog className="calendar-dialog">
          <Calendar>
            <header className="calendar-heading">
              <Button slot="previous" aria-label={t("Tháng trước")}>
                <ChevronLeft size={18} />
              </Button>
              <Heading />
              <Button slot="next" aria-label={t("Tháng sau")}>
                <ChevronRight size={18} />
              </Button>
            </header>
            <CalendarGrid>
              {(date) => <CalendarCell date={date} className="calendar-cell" />}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}
