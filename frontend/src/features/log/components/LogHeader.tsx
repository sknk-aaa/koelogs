import WeekCalendar from "./WeekCalendar";

type Props = {
  date: string;
  onChangeDate: (next: string) => void;
  onOpenMonthly: () => void;
};

export default function LogHeader({ date, onChangeDate, onOpenMonthly }: Props) {
  return (
    <div className="logPage__header">
      <div className="logPage__headerLeft">
        <div className="logPage__title">ログ</div>
      </div>

      <div className="logPage__headerCenter">
        <WeekCalendar value={date} onChange={onChangeDate} />
      </div>

      <div className="logPage__headerRight">
        <button className="logPage__btn logPage__monthBtn" onClick={onOpenMonthly}>
          月のログ一覧
        </button>
      </div>
    </div>
  );
}
