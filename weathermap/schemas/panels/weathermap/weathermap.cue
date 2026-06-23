package model

import (
	"github.com/perses/shared/cue/common"
)

kind: "Weathermap"
spec: close({
	legend?:        #legend
	thresholds?:    common.#thresholds
	querySettings?: #querySettings
	nodes?: [...#node]
	edges?: [...#edge]
})

#legend: {
	position: "bottom" | "right"
	mode?:    "list" | "table"
	size?:    "small" | "medium"
	values?: [...common.#calculation]
}

#querySettings: [...{
	queryIndex: int & >=0
	colorMode:  "fixed" | "fixed-single"
	colorValue: =~"^#(?:[0-9a-fA-F]{3}){1,2}$" // hexadecimal color code
}]

#node: {
	id:          string
	x:           number
	y:           number
	size?:       number & >0
	kind?:       "rectangle" | "icon" | "text"
	label?:      string
	icon?:       "server" | "router" | "switch" | "cloud" | "database"
	queryIndex?: int & >=0
	colorMode?:  "threshold" | "fixed"
	color?:      =~"^#(?:[0-9a-fA-F]{3}){1,2}$"
}

#edge: {
	id:            string
	source:        string
	target:        string
	sourceAnchor?: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
	targetAnchor?: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
	x2?:           number
	y2?:           number
}
