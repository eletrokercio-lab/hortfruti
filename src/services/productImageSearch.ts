/**
 * Busca de fotos para produtos (hortifruti).
 * Usa a API aberta do Wikimedia Commons — sem chave, sem custo,
 * com CORS habilitado (origin=*), direto do navegador.
 */

// Mapa verificado: nome normalizado -> URLs de fotos conferidas (carregam e correspondem ao produto)
const CURATED_IMAGES: Record<string, string[]> = {
  'vagem': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Four_Different_Varieties_of_Green_Beans_%28Phaseolus_vulgaris%29.jpg/500px-Four_Different_Varieties_of_Green_Beans_%28Phaseolus_vulgaris%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'espinafre': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Spinach_leaves.jpg/500px-Spinach_leaves.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'coentro': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Coriander_Leaves.jpg/500px-Coriander_Leaves.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'radite': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Daikon.Japan.jpg/500px-Daikon.Japan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'almeirao': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Chicory_basal_leaves_%288689121952%29.jpg/500px-Chicory_basal_leaves_%288689121952%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'alface americana': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Iceberg_lettuce_%28IJssla_krop%29.jpg/500px-Iceberg_lettuce_%28IJssla_krop%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Iceberg_lettuce_in_Poplar_Farmhouse.jpg/500px-Iceberg_lettuce_in_Poplar_Farmhouse.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'alface crespa': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Lettuce_2_-_Flickr_-_Trinity.jpg/500px-Lettuce_2_-_Flickr_-_Trinity.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'banana prata': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Banana_bunch_in_a_banana_farm_at_Chinawal.jpg/500px-Banana_bunch_in_a_banana_farm_at_Chinawal.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Madeira-Camara_de_Lobos-Banana_Bunch-01ESD.jpg/500px-Madeira-Camara_de_Lobos-Banana_Bunch-01ESD.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'cheiro verde': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Parsley_bunches_-_Wellington%2C_New_Zealand.jpg/500px-Parsley_bunches_-_Wellington%2C_New_Zealand.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Parsley_Leaves.jpg/500px-Parsley_Leaves.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'cebola pera': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Red_Onion_on_White.JPG/500px-Red_Onion_on_White.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Onion_on_White.JPG/500px-Onion_on_White.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'alface lisa': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Romaine_lettuce.jpg/500px-Romaine_lettuce.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'alface roxa': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Lollo_Rosso_Lollo_Bianco_4881.jpg/500px-Lollo_Rosso_Lollo_Bianco_4881.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Lollo_Rosso_Lollo_Bianco_4884.jpg/500px-Lollo_Rosso_Lollo_Bianco_4884.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'a americana': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Iceberg_lettuce_%28IJssla_krop%29.jpg/500px-Iceberg_lettuce_%28IJssla_krop%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Iceberg_lettuce_in_Poplar_Farmhouse.jpg/500px-Iceberg_lettuce_in_Poplar_Farmhouse.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'batata doce': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Sweet_potato_roots.jpg/500px-Sweet_potato_roots.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Roots_Foods.jpg/500px-Roots_Foods.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'milho verde': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Maize_Cob_Forming.jpg/500px-Maize_Cob_Forming.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'limao taiti': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Lime_-_whole_and_halved.jpg/500px-Lime_-_whole_and_halved.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Two_limes.jpg/500px-Two_limes.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'chanterelle': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Dried_mushrooms.jpg/500px-Dried_mushrooms.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'couve flor': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Stack_of_cauliflower_heads.jpg/500px-Stack_of_cauliflower_heads.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Cauliflower_field_-_geograph.org.uk_-_104126.jpg/500px-Cauliflower_field_-_geograph.org.uk_-_104126.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'jabuticaba': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Jaboticaba_Myrciaria_cauliflora_fruit_2.jpg/500px-Jaboticaba_Myrciaria_cauliflora_fruit_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Starr-190512-6484-Prunus_persica_var_persica-fruit_table_featuring_peaches_bananas_pumpkins_jaboticaba_pepino_dulce_citrus_and_papayas-Hawea_Pl_Olinda-Maui_%2848301350316%29.jpg/500px-thumbnail.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'maca gala': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/2015-02-xx_Gala_%28apple%29.jpg/500px-2015-02-xx_Gala_%28apple%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Golden_Delicious%2C_SweeTango%2C_Granny_Smith%2C_and_Gala_apples_3.JPG/500px-Golden_Delicious%2C_SweeTango%2C_Granny_Smith%2C_and_Gala_apples_3.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'maca fuji': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/Apfel-Fuji.jpg/500px-Apfel-Fuji.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Cross_section_of_Fuji%2C_National_Fruit_Collection_%28acc._1963-019%29.jpg/500px-Cross_section_of_Fuji%2C_National_Fruit_Collection_%28acc._1963-019%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'cebolinha': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Allium_fistulosum_MHNT.BOT.2011.3.23.jpg/500px-Allium_fistulosum_MHNT.BOT.2011.3.23.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Allium_fistulosum_Ypey26.jpg/500px-Allium_fistulosum_Ypey26.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'beterraba': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Beetroots_in_a_basket.jpg/500px-Beetroots_in_a_basket.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Beta_vulgaris%2C_San_Francisco_farmers_market.jpg/500px-Beta_vulgaris%2C_San_Francisco_farmers_market.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'abobrinha': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Calabac%C3%ADn%2C_M%C3%BAnich%2C_Alemania%2C_2013-03-30%2C_DD_01.JPG/500px-Calabac%C3%ADn%2C_M%C3%BAnich%2C_Alemania%2C_2013-03-30%2C_DD_01.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'berinjela': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Solanum_melongena_24_08_2012_%281%29.JPG/500px-Solanum_melongena_24_08_2012_%281%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Japanese_White_Eggplant.jpg/500px-Japanese_White_Eggplant.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'nectarina': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Nectarine_Fruit_Development.jpg/500px-Nectarine_Fruit_Development.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/Nectarine_Fruit_Development-BIG.jpg/500px-Nectarine_Fruit_Development-BIG.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'carambola': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Carambola_Starfruit.jpg/500px-Carambola_Starfruit.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'tangerina': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Tangerine_halves.jpg/500px-Tangerine_halves.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'a crespa': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Lettuce_2_-_Flickr_-_Trinity.jpg/500px-Lettuce_2_-_Flickr_-_Trinity.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'melancia': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Liat_Portal_for_Foodie_Disorder_-_Whole_watermelon_before_cutting.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Whole_watermelon_before_cutting.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Whole_Watermelons_At_Local_Fruit_Vendor.jpg/500px-Whole_Watermelons_At_Local_Fruit_Vendor.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'mandioca': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Harvested_cassava_roots_08.jpg/500px-Harvested_cassava_roots_08.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Harvested_cassava_roots_03.jpg/500px-Harvested_cassava_roots_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'maracuja': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Passionfruit_and_cross_section.jpg/500px-Passionfruit_and_cross_section.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Passiflora_Edulis_Open_Fruit2.jpg/500px-Passiflora_Edulis_Open_Fruit2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'salsinha': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Parsley_bunches_-_Wellington%2C_New_Zealand.jpg/500px-Parsley_bunches_-_Wellington%2C_New_Zealand.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Parsley_Leaves.jpg/500px-Parsley_Leaves.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'rabanete': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Raphanus_sativus_kz01.jpg/500px-Raphanus_sativus_kz01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Raphanus_sativus_of_Salem.jpg/500px-Raphanus_sativus_of_Salem.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'pimentao': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/IleBaby_Bell_pepper_Capsicum_annuum_2.jpg/500px-IleBaby_Bell_pepper_Capsicum_annuum_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Baby_Bell_pepper_Capsicum_annuum_3.jpg/500px-Baby_Bell_pepper_Capsicum_annuum_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'mostarda': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Brassica_juncea_var._juncea.JPG/500px-Brassica_juncea_var._juncea.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Brassica_juncea_kz01.jpg/500px-Brassica_juncea_kz01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'escarola': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Cichorium_endivia_field.jpg/500px-Cichorium_endivia_field.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Cichorium_endivia_kz01.jpg/500px-Cichorium_endivia_kz01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'brocolis': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Liat_Portal_for_Foodie_Disorder_-_Broccoli_from_San_Francisco_farmers_market.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Broccoli_from_San_Francisco_farmers_market.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Broccoli_DSC00861.png/500px-Broccoli_DSC00861.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'gengibre': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/GingerRoot_Novo_Los_Angeles.jpg/500px-GingerRoot_Novo_Los_Angeles.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'laranja': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/500px-Oranges_-_whole-halved-segment.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Ambersweet_oranges.jpg/500px-Ambersweet_oranges.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'abacate': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Avocado_with_cross_section_edit.jpg/500px-Avocado_with_cross_section_edit.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Avocado_Hass_-_single_and_halved.jpg/500px-Avocado_Hass_-_single_and_halved.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'abacaxi': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/%E0%B4%95%E0%B5%88%E0%B4%A4%E0%B4%9A%E0%B5%8D%E0%B4%9A%E0%B4%95%E0%B5%8D%E0%B4%95.jpg/500px-%E0%B4%95%E0%B5%88%E0%B4%A4%E0%B4%9A%E0%B5%8D%E0%B4%9A%E0%B4%95%E0%B5%8D%E0%B4%95.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Pineapple_fruit_2.jpg/500px-Pineapple_fruit_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'pessego': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Autumn_Red_peaches.jpg/500px-Autumn_Red_peaches.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'morango': ["https://upload.wikimedia.org/wikipedia/commons/d/de/FraiseFruitPhoto.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Still_life_with_strawberries_in_a_crystal_bowl.jpg/500px-Still_life_with_strawberries_in_a_crystal_bowl.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'repolho': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Starr_080103-1276_Brassica_oleracea_var._capitata.jpg/500px-Starr_080103-1276_Brassica_oleracea_var._capitata.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'cenoura': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/A_tray_of_fresh_carrots.jpg/500px-A_tray_of_fresh_carrots.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'abobora': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Cucurbita_2011_G1.jpg/500px-Cucurbita_2011_G1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'pitanga': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Pitanga-eugenia-uniflora.jpg/500px-Pitanga-eugenia-uniflora.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Eugenia_uniflora_fruit.JPG/500px-Eugenia_uniflora_fruit.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'tomate': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Organic_home-grown_tomatoes_-_unripe_to_ripe.jpg/500px-Organic_home-grown_tomatoes_-_unripe_to_ripe.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Bright_red_tomato_and_cross_section02.jpg/500px-Bright_red_tomato_and_cross_section02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'batata': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Potato_tuber_%28248_03%29_Potato_tuber_cross-section.jpg/500px-Potato_tuber_%28248_03%29_Potato_tuber_cross-section.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Potato_tuber_%28250_35%29_Potato_tuber_cross-section.jpg/500px-Potato_tuber_%28250_35%29_Potato_tuber_cross-section.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'cebola': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Red_Onion_on_White.JPG/500px-Red_Onion_on_White.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Onion_on_White.JPG/500px-Onion_on_White.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'banana': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Banana_bunch_in_a_banana_farm_at_Chinawal.jpg/500px-Banana_bunch_in_a_banana_farm_at_Chinawal.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Madeira-Camara_de_Lobos-Banana_Bunch-01ESD.jpg/500px-Madeira-Camara_de_Lobos-Banana_Bunch-01ESD.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'alface': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Romaine_lettuce.jpg/500px-Romaine_lettuce.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Lactuca_sativa_var._longifolia_Feria.jpg/500px-Lactuca_sativa_var._longifolia_Feria.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'a lisa': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Romaine_lettuce.jpg/500px-Romaine_lettuce.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'a roxa': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Lollo_Rosso_Lollo_Bianco_4881.jpg/500px-Lollo_Rosso_Lollo_Bianco_4881.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Lollo_Rosso_Lollo_Bianco_4884.jpg/500px-Lollo_Rosso_Lollo_Bianco_4884.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'agriao': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Watercress_%282%29.JPG/500px-Watercress_%282%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Nasturtium_officinale_kz02.jpg/500px-Nasturtium_officinale_kz02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'rucula': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/Eruca_sativa.jpg/500px-Eruca_sativa.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'pepino': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Cucumber_in_jaffna.JPG/500px-Cucumber_in_jaffna.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/2012_08_05_038_Gurkenranke.jpg/500px-2012_08_05_038_Gurkenranke.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'acelga': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Chard_%28Beta_vulgaris_var_cicla%29.jpg/500px-Chard_%28Beta_vulgaris_var_cicla%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'goiaba': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Goiaba_vermelha.jpg/500px-Goiaba_vermelha.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Guava_Fruit.jpg/500px-Guava_Fruit.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'chuchu': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Sechium_edule_dsc07767.jpg/500px-Sechium_edule_dsc07767.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Chayote_1.jpg/500px-Chayote_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'quiabo': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Quiabo.jpg/500px-Quiabo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Okra_%28Abelmoschus_esculentus%29_Feb_2019._DSC_0060_01.jpg/500px-Okra_%28Abelmoschus_esculentus%29_Feb_2019._DSC_0060_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'cereja': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Cherry_Stella444.jpg/500px-Cherry_Stella444.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'ameixa': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Plum_-_fruit_x1.jpg/500px-Plum_-_fruit_x1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Red-Plums.jpg/500px-Red-Plums.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'pomelo': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Citrus_paradisi_%28Grapefruit%2C_pink%29_white_bg.jpg/500px-Citrus_paradisi_%28Grapefruit%2C_pink%29_white_bg.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/Grapefruits_-_whole-halved-segments.jpg/500px-Grapefruits_-_whole-halved-segments.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'manga': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Mangos_-_single_and_halved.jpg/500px-Mangos_-_single_and_halved.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Mango_fruit_Nam_Dok_Mai.jpg/500px-Mango_fruit_Nam_Dok_Mai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'couve': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Portuguese_kale_%28Brassica_oleracea_var._viridis%29_leaf%2C_Ponte_de_Sor%2C_Portugal_%28approx._GPS_location%29_julesvernex2.jpg/500px-Portuguese_kale_%28Brassica_oleracea_var._viridis%29_leaf%2C_Ponte_de_Sor%2C_Portugal_%28approx._GPS_location%29_julesvernex2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Portuguese_kale_%28Brassica_oleracea_var._viridis%29_leaves_and_buds%2C_Ponte_de_Sor%2C_Portugal_%28approx._GPS_location%29_julesvernex2.jpg/500px-Portuguese_kale_%28Brassica_oleracea_var._viridis%29_leaves_and_buds%2C_Ponte_de_Sor%2C_Portugal_%28approx._GPS_location%29_julesvernex2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'limao': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Lime_-_whole_and_halved.jpg/500px-Lime_-_whole_and_halved.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Two_limes.jpg/500px-Two_limes.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'mamao': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Papaya_-_longitudinal_section_close-up_view.jpg/500px-Papaya_-_longitudinal_section_close-up_view.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Papaya_-_longitudinal_section.jpg/500px-Papaya_-_longitudinal_section.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'melao': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Canteloupe_and_cross_section.jpg/500px-Canteloupe_and_cross_section.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Cucumis_melo_var._cantalupensis_Early_Frame_Prescott_0zz.jpg/500px-Cucumis_melo_var._cantalupensis_Early_Frame_Prescott_0zz.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'caqui': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Fuyu_Persimmon_%28Diospyros_Kaki%29.jpg/500px-Fuyu_Persimmon_%28Diospyros_Kaki%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Fuyu_persimmon_fruits%2C_one_cut_open.jpg/500px-Fuyu_persimmon_fruits%2C_one_cut_open.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'maca': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/500px-Red_Apple.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'alho': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Opened_garlic_bulb_with_garlic_clove.jpg/500px-Opened_garlic_bulb_with_garlic_clove.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'coco': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Coconuts_-_single_and_cracked_open.jpg/500px-Coconuts_-_single_and_cracked_open.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'figo': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Fig_%28Ficus_carica%29_fruit_halved.jpg/500px-Fig_%28Ficus_carica%29_fruit_halved.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Bowl_of_Figs.jpg/500px-Bowl_of_Figs.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'kiwi': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Kiwi_%28Actinidia_chinensis%29_1_Luc_Viatour.jpg/500px-Kiwi_%28Actinidia_chinensis%29_1_Luc_Viatour.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Kiwifruit_%27Gold%27_cross_section.jpg/500px-Kiwifruit_%27Gold%27_cross_section.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'pera': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Four_pears.jpg/500px-Four_pears.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/D%27anjou_pear.jpg/500px-D%27anjou_pear.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'uva': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Green_Grape_3.jpg/500px-Green_Grape_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Edle_Weinrebe%2C_%27Vitis_vinifera%27_subsp._%27vinifera.jpg/500px-Edle_Weinrebe%2C_%27Vitis_vinifera%27_subsp._%27vinifera.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
  'ovo': ["https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Egg_cartons_with_chicken_eggs_03.jpg/500px-Egg_cartons_with_chicken_eggs_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Egg_cartons_with_chicken_eggs_02.jpg/500px-Egg_cartons_with_chicken_eggs_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"],
};

export interface ProductImageOption {
  url: string;
  title: string;
}

// Palavras que não ajudam na busca de foto (embalagem/unidade)
const NOISE_WORDS = new Set([
  'kg', 'cx', 'un', 'saco', 'bandeja', 'duzia', 'dúzia', 'especial', 'comum',
  'nacional', 'lavada', 'selecionada', 'mista', 'verde', 'italiana', 'extra',
  '1a', '2a', 'tipo', 'folhas', 'mistura',
]);

/** Normaliza para casar com o mapa: "Maçã Gala 1A" -> "maca gala 1a" */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Foto verificada do produto (sincrono) — null se não estiver no mapa */
export function getCuratedImage(productName: string): string | null {
  const urls = findCurated(productName);
  return urls ? urls[0] : null;
}

/** Procura o produto no mapa verificado (chave mais longa primeiro, por palavra inteira) */
function findCurated(productName: string): string[] | null {
  const norm = normalizeName(productName);
  if (!norm) return null;
  const keys = Object.keys(CURATED_IMAGES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (new RegExp(`\\b${escapeRegex(key)}\\b`).test(norm)) {
      const urls = CURATED_IMAGES[key];
      return urls && urls.length ? urls : null;
    }
  }
  return null;
}

/** Simplifica "Tomate Italiano 1A" -> "tomate" | "Maçã Gala" -> "maçã gala" */
function buildQuery(name: string): string {
  const words = normalizeName(name)
    .split(' ')
    .filter((w) => w.length > 1 && !NOISE_WORDS.has(w) && !/^\d/.test(w));
  // No máximo 2 palavras principais para não perder relevância
  return words.slice(0, 2).join(' ') || name;
}

export async function searchProductImages(
  productName: string,
  max = 4
): Promise<ProductImageOption[]> {
  // 1) Mapa verificado: foto correta na hora, sem rede
  const curated = findCurated(productName);
  if (curated) {
    const options = curated.map((url) => ({ url, title: 'Foto verificada' }));
    if (options.length >= max) return options.slice(0, max);
    // completa com a busca aberta se o mapa tiver menos que o máximo
    const extra = await searchCommons(productName, max - options.length);
    const seen = new Set(options.map((o) => o.url));
    for (const opt of extra) {
      if (!seen.has(opt.url)) {
        options.push(opt);
        seen.add(opt.url);
        if (options.length >= max) break;
      }
    }
    return options;
  }
  return searchCommons(productName, max);
}

async function searchCommons(productName: string, max: number): Promise<ProductImageOption[]> {
  const q = buildQuery(productName);
  if (!q) return [];

  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    '&generator=search&gsrnamespace=6&gsrlimit=10&prop=imageinfo' +
    '&iiprop=url|mime&iiurlwidth=480' +
    `&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];

    const json = await res.json();
    const pages: any[] = Object.values(json?.query?.pages || {});
    // "index" é a ordem de relevância da busca
    pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));

    const seen = new Set<string>();
    const options: ProductImageOption[] = [];
    for (const page of pages) {
      const info = page?.imageinfo?.[0];
      const thumb = info?.thumburl || info?.url;
      if (!thumb || info?.mime === 'image/svg+xml' || info?.mime === 'image/gif') continue;
      if (seen.has(thumb)) continue;
      seen.add(thumb);
      options.push({
        url: thumb,
        title: String(page.title || '').replace(/^File:/, ''),
      });
      if (options.length >= max) break;
    }
    return options;
  } catch {
    return [];
  }
}
