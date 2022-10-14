const width = 1450;
const height = 1300;
const margin = {top: 100, right: 0, bottom: 0, left: 150};
const innerCircleRadius = 300; // Inner radius of the visualization (where the group arcs are positioned)
const outerCircleRadius = 450; // Outer radius of the visualization (including the flight time lines)

// Load the data
d3.csv('https://raw.githubusercontent.com/kelsey-n/radial-visualization-astronauts/main/data/astronauts_nasa_1959-2017.csv', d3.autoType).then(data => {
  // We want to get astronauts by their group, year and group_name
  // first create a set of unique combos of group, year and group_names
  var uniqueVals = new Set()
  data.forEach(row => {
    uniqueVals.add(JSON.stringify([row.group, row.year, row.group_name]))
  })
  var groups = [];
  uniqueVals.forEach(group => {
    var groupVals = JSON.parse(group) // parse the string back to an array
    groups.push({
      group: groupVals[0],
      year: groupVals[1],
      group_name: groupVals[2],
      astronauts: data.filter(row => row.group === groupVals[0])
    })
  })

  svg = d3.select('#viz')
    .append('svg')
      .attr('width', width)
      .attr('height', height)

  const group = svg
    .selectAll('g')
    .data(groups)
    .join('g')
      .attr('class', data => `group group-${data.group}`)
      .attr('transform', `translate(${width/2}, ${(height-margin.top-margin.bottom)/2})`)

  // create arc generator and store it in a variable
  const arcGenerator = d3.arc()
    .innerRadius(innerCircleRadius)
    .outerRadius(innerCircleRadius+5)
    .cornerRadius(5) // Radius of each corner of an arc (in pixels); cannot be larger than (outerCircleRadius-innerCircleRadius)/2
    .padAngle(degreesToRadians(0.5)); // Padding between each group, in radians

  // create a pie generator to get the startangle and endangle for each arc
  const pieGenerator = d3.pie()
    .value(d => d.astronauts.length) //set the value for the pie chart to be calculated as the number of astronauts in each group, as fits with the 'groups' data format
    .sort(null) //remove the default pie generator's sorting by descending size

  // append arcs to the viz - both the visible arcs and invisible arcs to append the text to
  const groupArcs = group
    .append('path') //append an svg path to each group
      .data(pieGenerator(groups)) //we can call pieGenerator(groups) here since we set the value for the pie chart in the generator above. We also have access to the original groups data in d.data
      .attr('fill', '#6794AD')
      .attr('d', arcGenerator) //visible arcs
      .each(function(d,i) { //invisible arcs
        //Regex to search pattern for everything between the start and the first capital L
        var firstArcSection = /(^.+?)L/;
        //Grab everything up to the first Line statement
        var newArc = firstArcSection.exec( d3.select(this).attr("d") )[1];
        //Replace all the commas so that IE can handle it
        newArc = newArc.replace(/,/g , " ");

        //If the end angle lies beyond a quarter of a circle (90 degrees or pi/2) AND start angle < -90 degrees
        //flip the end and start position to flip the direction of the text along these bottom arcs
        if ((d.endAngle > degreesToRadians(90)) && (d.startAngle < degreesToRadians(270))) {
            // NOTE that each arc we drew in blue actually consists of 3 arcs: 1 tiny one with small radius, 1 large one that's the majority of the drawn arc, and another tiny one
            // We only need the middle large arc here since the only aim is to write text along this arc and center it
            // we will switch the end and start position of this largest arc, pulling out the large radius
            // Everything between the first 001 and first capital A
            var startLoc = /0 0 1(.*?)A/;
            //Everything between ANY capital A and the following 0 0 1 (will use matchAll; have to make this a global regex)
            var middleLoc = /A(.*?)0 0 1/g;
            //Everything between ANY 0 0 1 and the following A (will use matchAll; have to make a global regex)
            var endLoc = /0 0 1 (.*?)A/g;
            //Flip the direction of the arc by switching the start and end point
            //and using a 0 (instead of 1) sweep flag
            var newStart = [...newArc.matchAll(endLoc)][1][1]; //array will store all occurrences of the match between 001 and A; we need the 2nd occurrence
            var newEnd = startLoc.exec( newArc )[1]; //did not need matchAll since this regex only finds the first occurrence
            var middleSec = [...newArc.matchAll(middleLoc)][1][1]; //second occurrence

            //Build up the new arc notation, set the sweep-flag to 0
            newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
        }

        //Create a new invisible arc that the text can flow along
        svg.append("path")
            .attr("class", "hiddenGroupArcs")
            .attr("id", "path-"+d.data.group)
            .attr("d", newArc)
            .style("fill", "none")
      })

  // append year labels
  const groupLabels = group
    .append('text')
      .data(pieGenerator(groups))
      .attr('dy', (d,i) => (d.endAngle > degreesToRadians(90)) && (d.startAngle < degreesToRadians(270)) ? -11 : 20) //move text to the inside of the circle
      .style('font-size', '12px')
    .append('textPath')
      .attr('xlink:href', d => `#path-${d.data.group}`)
      .style('text-anchor', 'middle')
      .attr('startOffset', '50%')
      .text(d => (d.data.year === null) ? 'Payload Specialists' : d.data.year)

})
