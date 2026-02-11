ScaleTrack.delete_all

scale_types = [ "5tone", "octave" ]
tempos = [ 100, 120, 140 ]

scale_types.each do |t|
  tempos.each do |bpm|
    ScaleTrack.create!(
      scale_type: t,
      tempo: bpm,
      file_path: "/scales/#{t}_#{bpm}.mp3"
    )
  end
end
