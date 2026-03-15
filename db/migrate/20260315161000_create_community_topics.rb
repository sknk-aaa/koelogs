class CreateCommunityTopics < ActiveRecord::Migration[8.1]
  def change
    create_table :community_topics do |t|
      t.references :user, null: false, foreign_key: true
      t.string :category, null: false
      t.string :title, null: false, limit: 120
      t.text :body, null: false
      t.integer :likes_count, null: false, default: 0
      t.integer :comments_count, null: false, default: 0
      t.boolean :published, null: false, default: true

      t.timestamps
    end

    add_index :community_topics, :category
    add_index :community_topics, :created_at
    add_index :community_topics, :likes_count
    add_index :community_topics, [ :published, :created_at ]
    add_index :community_topics, [ :published, :likes_count ]

    create_table :community_topic_comments do |t|
      t.references :topic, null: false, foreign_key: { to_table: :community_topics }
      t.references :user, null: false, foreign_key: true
      t.bigint :parent_id
      t.text :body, null: false

      t.timestamps
    end

    add_index :community_topic_comments, :parent_id
    add_index :community_topic_comments, [ :topic_id, :created_at ]
    add_foreign_key :community_topic_comments, :community_topic_comments, column: :parent_id

    create_table :community_topic_likes do |t|
      t.references :topic, null: false, foreign_key: { to_table: :community_topics }
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end

    add_index :community_topic_likes, [ :topic_id, :user_id ], unique: true
  end
end
