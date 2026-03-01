import WeekCalendar from "./WeekCalendar";

type Props = {
  date: string;
  onChangeDate: (next: string) => void;
};

export default function LogHeader({ date, onChangeDate }: Props) {
  return (
    <div className="logPage__header">
      <div className="logPage__headerLeft">
        <div className="logPage__title">日ログ</div>
      </div>

      <div className="logPage__headerCenter">
        <WeekCalendar value={date} onChange={onChangeDate} />
      </div>
    </div>
  );
}
