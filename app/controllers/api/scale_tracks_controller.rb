class Api::ScaleTracksController < ApplicationController
  def index
    tracks = ScaleTrack.order(:scale_type, :tempo)
    render json: tracks
  end
end
