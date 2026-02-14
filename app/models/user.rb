class User < ApplicationRecord
  has_secure_password

  has_many :training_logs, dependent: :destroy
  has_many :training_menus, dependent: :destroy
  has_many :ai_recommendations, dependent: :destroy

  validates :email, presence: true, uniqueness: true
end
