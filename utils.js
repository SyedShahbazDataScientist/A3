class ChartUtils {
    static createTooltip() {
        return d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }

    static showTooltip(tooltip, html, event) {
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(html)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }

    static hideTooltip(tooltip) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }

    static getContainer() {
        const container = document.getElementById('visualization');
        const width = container.clientWidth || CONFIG.DEFAULT_WIDTH;
        const height = container.clientHeight || CONFIG.DEFAULT_HEIGHT;
        return { container, width, height };
    }

    static clearContainer() {
        d3.select('#visualization').selectAll('*').remove();
    }

    static addTitle(svg, title, width) {
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", width/2)
            .attr("y", CONFIG.CHART_MARGIN)
            .text(title);
    }
}

class DataUtils {
    static validateData(data) {
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }
        if (data.length === 0) {
            throw new Error('Data array is empty');
        }
        return true;
    }

    static getDataFields(data) {
        const fields = {
            name: data[0].hasOwnProperty('Artist') ? 'Artist' : 'Company',
            value: data[0].hasOwnProperty('FollowersInMillions') ? 'FollowersInMillions' : 'Revenue',
            group: data[0].hasOwnProperty('Genre') ? 'Genre' : 'Sector',
            relations: data[0].hasOwnProperty('CollaboratedWith') ? 'CollaboratedWith' : 'ConnectedTo'
        };
        return fields;
    }
}