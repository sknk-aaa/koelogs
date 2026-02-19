class AddRankingParticipationEnabledToUsers < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :ranking_participation_enabled, :boolean, null: false, default: false

    execute <<~SQL.squish
      UPDATE users
      SET ranking_participation_enabled = public_profile_enabled
    SQL
  end

  def down
    remove_column :users, :ranking_participation_enabled
  end
end
