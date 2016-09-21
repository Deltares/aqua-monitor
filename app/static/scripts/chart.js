function toChartValues(values) {
    var results = [];
    for (var i = 0; i < values.length; i++) {
        var v = values[i];
        var date = new Date(v.time);
        results.push([date, 100 - parseInt(v.cloud_cover),
            '<p align="left"><b>Date:</b>' + date.getFullYear() + '-' + (date.getMonth() + 1) + "-" + date.getDate()
            + '</p><p align="left"><b>CloudCover:</b>' + v.cloud_cover + '</p><p align="left"><b>Id:</b>' + v.id + '</p>']);
    }
    return results;
}

function setChartData(data) {
    // load the image information here in dictionary with keys based on satellite
    // add first data series -> Landsat4
    var table = new google.visualization.DataTable();
    table.addColumn('date', 'Date');
    table.addColumn('number', 'Quality');
    table.addColumn({type: 'string', role: 'tooltip', p: {html: true}});
    /*
     table.addRows(toChartValues(data[0].values));
     table.addRows(toChartValues(data[1].values));
     table.addRows(toChartValues(data[2].values));
     */
    table.addRows(toChartValues(data));



    var dash = new google.visualization.Dashboard(document.getElementById('chart-dashboard'));

    var control = new google.visualization.ControlWrapper({
        controlType: 'ChartRangeFilter',
        containerId: 'chart-range',
        options: {
            filterColumnIndex: 0,
            ui: {
                chartType: 'ColumnChart',
                chartOptions: {
                    height: 50,
                    width: 1100,
                    chartArea: {
                        width: '95%',
                        //height: '20%'
                    }
                },
                chartView: {
                    columns: [0, 1]
                }
            }
        }
    });

    var gchart = new google.visualization.ChartWrapper({
        chartType: 'ColumnChart',
        containerId: 'chart',
        options: {
            tooltip: {isHtml: true},
            legend: {position: 'none'},
            //vAxis: {title: 'Cloud Cover [%]'},
            bar: {groupWidth: 3},
            height: 150,
            width: 1100,
            interpolateNulls: true,
            //backgroundColor: {fill: 'transparent'},
            hAxis: {format: 'yyyy-MM-dd'},
            chartArea: {width: '95%'},
            animation: {duration: 0}
        }
    });



    dash.bind([control], [gchart]);
    dash.draw(table);
}

// TODO: replace google chart by something that is a bit more performant
// google.charts.load('current', {packages: ['corechart']});
// google.load('visualization', '1', {packages: ['controls', 'charteditor']});
