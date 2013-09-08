// app.js

var App = function(){

		var Timby = {};
		window.Timby = Timby;

		var template = function(name) {
			return Mustache.compile($('#'+name+'-template').html());
		};
		
		Timby.Index = Backbone.View.extend({
			initialize : function(){
				this.mapLayerUrl = 'http://andrew.cartodb.com/api/v2/viz/9d151a9c-093a-11e3-a898-3085a9a9563c/viz.json';
				this.reportLayerUrl = 'http://andrew.cartodb.com/api/v2/viz/fc95c9f6-0ae0-11e3-b191-3085a9a9563c/viz.json';
				this.setupBaseMap();
				this.setupCartoDBLayer();
				this.render();
			},
		
			render : function(){
				this.$el.html('');

				// create the gear button for changing the settings
				// the actual settings modal is created inside this method too
				var gear = new Timby.GearButton(this.map, this.baselayer, 'topright');

				// Create the legend that states the marker colors
				var legend = new Timby.LegendView(
									this.map, 
									'bottomleft', 
									{items: [
										{item: 'palm oil', id: 'palm', color: 'green'}, 
										{item: 'hunting', id: 'hunting', color: 'blue'}, 
										{item: 'logging', id: 'logging', color: 'yellow'}, 
										{item: 'mining', id: 'mining', color: 'red'}
									]}
							 ); // color can take rgb, rgba, hex, or text
				return this;
			},

			setupBaseMap : function () {
				this.map = L.map('map', { attributionControl: false}).setView([6.779171028142874, -8.9373779296875], 8);

				// this.attr = new L.Control.Attribution({position: 'topleft'}).addTo(this.map);
				// this.zoom = new L.Control.Zoom({ position: 'bottomleft' }).addTo(this.map);

				this.baselayer = L.tileLayer('http://{s}.maptile.lbs.ovi.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?token=x4FPrgPvCoVxpWbvDVjD-g&app_id=7INhahrI8e6fBdCx9Qgd', {
					subdomains: '1234'
				});
				this.baselayer.addTo(this.map);
			},

			setupCartoDBLayer : function () {
				var self = this;


				cartodb.createLayer(this.map, this.reportLayerUrl)
					.addTo(this.map)
					.done(function(reports){
						//turn off our local datapoints later
						reports.hide();
						// tell the layer what columns we want from click events
						reports.getSubLayer(0).set({interactivity: 'url, media'})

						//register a click event
			          	reports.on('featureClick', function(e, pos, latlng, data) {
			          		//updated the displayed image
			          		if (data.media == 'image'){	
				            	$('.media #image-view').html('<img src="'+data.url+'" />');
				            } else if (data.media == 'video'){
				            	$('.media #image-view').html("<video width='470' height='360' controls><source src='./"+data.url+"' type='video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"'></video>");
				            }
			            });
						self.reports = reports;
					});


				cartodb.createLayer(this.map, this.mapLayerUrl)
					.addTo(this.map)
					.done(function(layer){

						// layer.getSubLayer(1).hide();

						//getSubLayer(0) contains our global view of 'reports'
						//getSubLayer(1) contains clusters of individual reports

						// on click of 0 you would grab an ID and filter layer 1 based on that ID, then show it on the map while hiding 0. we fake it all below :)

						//SETUP listener for legend/filter clicks
						// probably could be done better a backbone way, but this is rough
						$('.legend li').click(function(d){
							if ($(this).hasClass('active')) {
								// Filter is being turned off
								// Remove css highlight and reset SQL
								$('.legend li').removeClass('active');
								layer.getSubLayer(0).setSQL("SELECT * FROM timby_demo")
							} else {
								$('.legend li').removeClass('active')
								// A filter is active. set some css and apply a
								// sql filter to our layer
								$(this).addClass('active');
								layer.getSubLayer(0).setSQL("SELECT * FROM timby_demo WHERE type='"+$(this).attr('id')+"'");
							}
							
						})
			          layer.setInteraction(true);
					  // tell the layer what columns we want from click events
					  layer.getSubLayer(0).set({interactivity: 'title, date, companies, people, tags, description'})

			          $('.sidepanel .close').click(function(){
			          	$('.sidepanel').hide('slow'); 
			          	$('.gear').show();
			            self.reports.setInteraction(false);
			            self.reports.hide();

			          	layer.setInteraction(true);
			            layer.show();

			          })

			          layer.on('featureClick', function(e, pos, latlng, data) {
			          	//this is one way you could dynamically update content in the sidepanel
			          	$('.sidepanel .title').text(data.title)

			            $('.gear').hide();
			            $('.sidepanel').show('slow');
			          	layer.setInteraction(false);
			            layer.hide();
			            self.reports.setInteraction(true);
			            self.reports.show();

			            // zoom to our sublayer;
			            var sql = new cartodb.SQL({ user: 'andrew' });
						sql.getBounds('SELECT * FROM timby_local').done(function(bounds) {
						   self.map.fitBounds(bounds);
						});
			          });
					});
			}
		
		});

		Timby.LegendView = Backbone.View.extend({
			template : template('legend'),
			events : {
			},
		
			initialize : function(map, position, collection) {
				this.map = map;
				this.collection = collection;
				var template = this.template;
				this.controller = L.Control.extend({
				    options: {
				        position: position
				    },
				    onAdd: function (map) {
				        var container = L.DomUtil.create('div', 'map-legend');
				        return container;
				    }
				});
				this.map.addControl(new this.controller());
				this.render();
			},

			render : function () {
				this.$el = $('.map-legend');
				this.$el.html(this.template(this.collection));
				return this;
			}	
		});


		Timby.GearButton = Backbone.View.extend({
			template : template('gear'),
			events : {
				'click' :'toggleModal'
			},
		
			initialize : function(map, baselayer, position) {
				this.map = map;
				this.baselayer = baselayer;
				var template = this.template;
				this.controller = L.Control.extend({
				    options: {
				        position: position
				    },
				    onAdd: function (map) {
				        var container = L.DomUtil.create('div', 'gear-button');
				        return container;
				    }
				});
				this.map.addControl(new this.controller());
				this.render();
			},

			render : function () {
				this.$el = $('.gear-button');
				this.$el.html(this.template);
				this.settings = new Timby.SettingsView(this.baselayer);
				return this;
			},

			toggleModal : function () {
				if ($('.settings').hasClass('show')){
					$('.settings').removeClass('show')
				} else {
					$('.settings').addClass('show')
				}
			}		
		});

		Timby.SettingsView = Backbone.View.extend({
			template : template('settings'),
			events : {
				'click .basemap': 'setBasemap'
			},
		
			initialize : function(baselayer) {
				this.baselayer = baselayer;
				this.render();
			},

			render : function () {
				this.$el.html(this.template);
				$('body').append(this.$el);

				$('.settings .close').click(function(){$('.settings').removeClass('show')});

				return this;
			},

			setBasemap : function (e) {
				var bm = $(e.target).parent().attr('id');
				if (bm=='toner') {
					this.baselayer.options.subdomains = ['a','b','c']
					this.baselayer.setUrl('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png')
				} else if (bm=='terrain') {
					this.baselayer.options.subdomains = ['1','2','3','4']
					this.baselayer.setUrl('http://{s}.maptile.lbs.ovi.com/maptiler/v2/maptile/newest/terrain.day/{z}/{x}/{y}/256/png8?token=x4FPrgPvCoVxpWbvDVjD-g&app_id=7INhahrI8e6fBdCx9Qgd')
				} else if (bm=='normal') {
					this.baselayer.options.subdomains = ['1','2','3','4']
					this.baselayer.setUrl('http://{s}.maptile.lbs.ovi.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?token=x4FPrgPvCoVxpWbvDVjD-g&app_id=7INhahrI8e6fBdCx9Qgd')
				} else if (bm=='forest') {
					// console.log(this.baselayer)
					this.baselayer.options.subdomains = ['a','b','c']
					this.baselayer.setUrl('http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png')
				}
			}
		});
	
		Timby.Router = Backbone.Router.extend({
			initialize : function(options){
				this.el = options.el;
			},
			routes : {
				"" : "index",
			},
			index : function(){
				var indexView = new Timby.Index();			
				this.el.empty();
				// this.el.append(indexView.render().el);
			}
		});
	
		var router = new Timby.Router({el : $('#main')});
		Backbone.history.start();
};
var b;