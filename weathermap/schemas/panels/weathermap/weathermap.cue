package model

import (
	"github.com/perses/shared/cue/common"
)

kind: "Weathermap"
spec: close({
	legend?:                 #legend
	thresholds?:             common.#thresholds
	format?:                 common.#format
	backgroundImage?:        string
	backgroundImageFit?:     "contain" | "stretch"
	querySettings?:          #querySettings
	edgeDefaultStrokeWidth?: number & >0
	edgeThresholdWidths?: [...#edgeThresholdStep]
	nodes?: [...#node]
	edges?: [...#edge]
})

#legend: {
	position: "bottom" | "right"
}

#querySettings: [...{
	queryIndex: int & >=0
	colorMode:  "fixed" | "fixed-single"
	colorValue: =~"^#(?:[0-9a-fA-F]{3}){1,2}$" // hexadecimal color code
}]

#node: {
	id:             string
	x:              number
	y:              number
	size?:          number & >0
	kind?:          "rectangle" | "icon" | "text"
	label?:         string
	labelPosition?: "above" | "below" | "left" | "right" | "center"
	labelPadding?:  number & >=0
	icon?:          string
	link?:          string
	queryIndex?:    int & >=0
	colorMode?:     "threshold" | "fixed"
	color?:         =~"^#(?:[0-9a-fA-F]{3}){1,2}$"
}

#edge: {
	id:                   string
	source:               string
	target:               string
	sourceAnchor?:        "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
	targetAnchor?:        "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
	x2?:                  number
	y2?:                  number
	bidirectional?:       bool
	thicknessMode?:       "fixed" | "threshold"
	strokeWidth?:         number & >0
	sourceQueryIndex?:    int & >=0
	targetQueryIndex?:    int & >=0
	sourceLabelTemplate?: string
	targetLabelTemplate?: string
}

#edgeThresholdStep: {
	value:       number
	strokeWidth: number & >0
}
