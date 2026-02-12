class User < ApplicationRecord
  has_secure_password

  has_many :training_logs, dependent: :destroy

  validates :email, presence: true, uniqueness: true
end
