class AddFeedbackTextToAnalysisSessions < ActiveRecord::Migration[7.1]
  def change
    add_column :analysis_sessions, :feedback_text, :text
  end
end
