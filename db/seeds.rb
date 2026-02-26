ScaleTrack.delete_all

scale_types = [ "5tone", "triad", "Descending5tone", "octave", "Risingoctave" ]
range_types = [ "low", "mid", "high" ]
# Tempo is fixed per audio source and not user-selectable on TrainingPage.
default_tempo = 100

scale_types.each do |t|
  range_types.each do |range|
    ScaleTrack.create!(
      scale_type: t,
      range_type: range,
      tempo: default_tempo,
      file_path: "/scales/#{t}-#{range}.mp3"
    )
  end
end
