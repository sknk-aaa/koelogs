class Api::ScaleTracksController < ApplicationController
  def index
    tracks = ScaleTrack.order(:scale_type, :range_type)
    render json: tracks
  end
end
