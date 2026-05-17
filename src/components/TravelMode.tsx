import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, MapPin, X, Search } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ScrollArea } from "@/components/ui/scroll-area";

// All cities by country — comprehensive worldwide list
const CITIES: { city: string; country: string }[] = [
  // ============================================================
  // EUROPE
  // ============================================================
  // Germany
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Hamburg", country: "Germany" },
  { city: "Frankfurt", country: "Germany" },
  { city: "Cologne", country: "Germany" },
  { city: "Düsseldorf", country: "Germany" },
  { city: "Stuttgart", country: "Germany" },
  { city: "Leipzig", country: "Germany" },
  { city: "Dortmund", country: "Germany" },
  { city: "Dresden", country: "Germany" },
  { city: "Hannover", country: "Germany" },
  { city: "Nuremberg", country: "Germany" },
  { city: "Bremen", country: "Germany" },
  { city: "Essen", country: "Germany" },
  { city: "Duisburg", country: "Germany" },
  { city: "Bochum", country: "Germany" },
  { city: "Wuppertal", country: "Germany" },
  { city: "Bielefeld", country: "Germany" },
  { city: "Bonn", country: "Germany" },
  { city: "Münster", country: "Germany" },
  { city: "Mannheim", country: "Germany" },
  { city: "Karlsruhe", country: "Germany" },
  { city: "Augsburg", country: "Germany" },
  { city: "Wiesbaden", country: "Germany" },
  { city: "Freiburg", country: "Germany" },
  { city: "Kiel", country: "Germany" },
  { city: "Lübeck", country: "Germany" },
  { city: "Rostock", country: "Germany" },
  { city: "Mainz", country: "Germany" },
  { city: "Saarbrücken", country: "Germany" },
  { city: "Potsdam", country: "Germany" },
  { city: "Heidelberg", country: "Germany" },
  { city: "Regensburg", country: "Germany" },
  // United Kingdom
  { city: "London", country: "United Kingdom" },
  { city: "Manchester", country: "United Kingdom" },
  { city: "Birmingham", country: "United Kingdom" },
  { city: "Liverpool", country: "United Kingdom" },
  { city: "Edinburgh", country: "United Kingdom" },
  { city: "Glasgow", country: "United Kingdom" },
  { city: "Leeds", country: "United Kingdom" },
  { city: "Bristol", country: "United Kingdom" },
  { city: "Belfast", country: "United Kingdom" },
  { city: "Cardiff", country: "United Kingdom" },
  { city: "Sheffield", country: "United Kingdom" },
  { city: "Newcastle", country: "United Kingdom" },
  { city: "Nottingham", country: "United Kingdom" },
  { city: "Leicester", country: "United Kingdom" },
  { city: "Southampton", country: "United Kingdom" },
  { city: "Brighton", country: "United Kingdom" },
  { city: "Aberdeen", country: "United Kingdom" },
  { city: "Cambridge", country: "United Kingdom" },
  { city: "Oxford", country: "United Kingdom" },
  { city: "Bath", country: "United Kingdom" },
  { city: "York", country: "United Kingdom" },
  { city: "Coventry", country: "United Kingdom" },
  { city: "Plymouth", country: "United Kingdom" },
  { city: "Swansea", country: "United Kingdom" },
  { city: "Dundee", country: "United Kingdom" },
  { city: "Inverness", country: "United Kingdom" },
  // France
  { city: "Paris", country: "France" },
  { city: "Marseille", country: "France" },
  { city: "Lyon", country: "France" },
  { city: "Nice", country: "France" },
  { city: "Toulouse", country: "France" },
  { city: "Bordeaux", country: "France" },
  { city: "Strasbourg", country: "France" },
  { city: "Lille", country: "France" },
  { city: "Nantes", country: "France" },
  { city: "Montpellier", country: "France" },
  { city: "Rennes", country: "France" },
  { city: "Grenoble", country: "France" },
  { city: "Dijon", country: "France" },
  { city: "Cannes", country: "France" },
  { city: "Clermont-Ferrand", country: "France" },
  { city: "Tours", country: "France" },
  { city: "Reims", country: "France" },
  { city: "Brest", country: "France" },
  { city: "Perpignan", country: "France" },
  { city: "Metz", country: "France" },
  { city: "Rouen", country: "France" },
  { city: "Ajaccio", country: "France" },
  // Spain
  { city: "Madrid", country: "Spain" },
  { city: "Barcelona", country: "Spain" },
  { city: "Valencia", country: "Spain" },
  { city: "Seville", country: "Spain" },
  { city: "Malaga", country: "Spain" },
  { city: "Ibiza", country: "Spain" },
  { city: "Bilbao", country: "Spain" },
  { city: "Palma de Mallorca", country: "Spain" },
  { city: "Zaragoza", country: "Spain" },
  { city: "Granada", country: "Spain" },
  { city: "Alicante", country: "Spain" },
  { city: "Córdoba", country: "Spain" },
  { city: "San Sebastián", country: "Spain" },
  { city: "Las Palmas", country: "Spain" },
  { city: "Tenerife", country: "Spain" },
  { city: "Murcia", country: "Spain" },
  { city: "Salamanca", country: "Spain" },
  { city: "Santander", country: "Spain" },
  { city: "Toledo", country: "Spain" },
  { city: "Vigo", country: "Spain" },
  { city: "A Coruña", country: "Spain" },
  { city: "Cádiz", country: "Spain" },
  { city: "Marbella", country: "Spain" },
  { city: "Tarragona", country: "Spain" },
  // Italy
  { city: "Rome", country: "Italy" },
  { city: "Milan", country: "Italy" },
  { city: "Naples", country: "Italy" },
  { city: "Florence", country: "Italy" },
  { city: "Venice", country: "Italy" },
  { city: "Turin", country: "Italy" },
  { city: "Bologna", country: "Italy" },
  { city: "Palermo", country: "Italy" },
  { city: "Genoa", country: "Italy" },
  { city: "Bari", country: "Italy" },
  { city: "Catania", country: "Italy" },
  { city: "Verona", country: "Italy" },
  { city: "Cagliari", country: "Italy" },
  { city: "Trieste", country: "Italy" },
  { city: "Pisa", country: "Italy" },
  { city: "Parma", country: "Italy" },
  { city: "Siena", country: "Italy" },
  { city: "Perugia", country: "Italy" },
  { city: "Bergamo", country: "Italy" },
  { city: "Brescia", country: "Italy" },
  { city: "Lecce", country: "Italy" },
  { city: "Rimini", country: "Italy" },
  // Portugal
  { city: "Lisbon", country: "Portugal" },
  { city: "Porto", country: "Portugal" },
  { city: "Faro", country: "Portugal" },
  { city: "Braga", country: "Portugal" },
  { city: "Coimbra", country: "Portugal" },
  { city: "Funchal", country: "Portugal" },
  { city: "Aveiro", country: "Portugal" },
  { city: "Évora", country: "Portugal" },
  { city: "Setúbal", country: "Portugal" },
  { city: "Ponta Delgada", country: "Portugal" },
  // Netherlands
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Rotterdam", country: "Netherlands" },
  { city: "The Hague", country: "Netherlands" },
  { city: "Utrecht", country: "Netherlands" },
  { city: "Eindhoven", country: "Netherlands" },
  { city: "Groningen", country: "Netherlands" },
  { city: "Tilburg", country: "Netherlands" },
  { city: "Maastricht", country: "Netherlands" },
  { city: "Breda", country: "Netherlands" },
  { city: "Leiden", country: "Netherlands" },
  { city: "Haarlem", country: "Netherlands" },
  { city: "Nijmegen", country: "Netherlands" },
  { city: "Arnhem", country: "Netherlands" },
  { city: "Delft", country: "Netherlands" },
  // Belgium
  { city: "Brussels", country: "Belgium" },
  { city: "Antwerp", country: "Belgium" },
  { city: "Ghent", country: "Belgium" },
  { city: "Bruges", country: "Belgium" },
  { city: "Liège", country: "Belgium" },
  { city: "Leuven", country: "Belgium" },
  { city: "Charleroi", country: "Belgium" },
  { city: "Namur", country: "Belgium" },
  // Luxembourg
  { city: "Luxembourg City", country: "Luxembourg" },
  { city: "Esch-sur-Alzette", country: "Luxembourg" },
  // Austria
  { city: "Vienna", country: "Austria" },
  { city: "Salzburg", country: "Austria" },
  { city: "Innsbruck", country: "Austria" },
  { city: "Graz", country: "Austria" },
  { city: "Linz", country: "Austria" },
  { city: "Klagenfurt", country: "Austria" },
  { city: "Villach", country: "Austria" },
  { city: "Bregenz", country: "Austria" },
  { city: "St. Pölten", country: "Austria" },
  { city: "Wels", country: "Austria" },
  { city: "Dornbirn", country: "Austria" },
  { city: "Wiener Neustadt", country: "Austria" },
  { city: "Steyr", country: "Austria" },
  { city: "Feldkirch", country: "Austria" },
  { city: "Bruck an der Mur", country: "Austria" },
  { city: "Leoben", country: "Austria" },
  { city: "Krems an der Donau", country: "Austria" },
  { city: "Eisenstadt", country: "Austria" },
  { city: "Kapfenberg", country: "Austria" },
  { city: "Hallein", country: "Austria" },
  { city: "Kufstein", country: "Austria" },
  { city: "Tulln", country: "Austria" },
  { city: "Ternitz", country: "Austria" },
  { city: "Schwechat", country: "Austria" },
  { city: "Baden", country: "Austria" },
  { city: "Spittal an der Drau", country: "Austria" },
  { city: "Gmünd", country: "Austria" },
  { city: "Kitzbühel", country: "Austria" },
  { city: "Zell am See", country: "Austria" },
  { city: "Lienz", country: "Austria" },
  { city: "Wolfsberg", country: "Austria" },
  { city: "Wörgl", country: "Austria" },
  { city: "Saalfelden", country: "Austria" },
  { city: "Ried im Innkreis", country: "Austria" },
  { city: "Vöcklabruck", country: "Austria" },
  { city: "Mistelbach", country: "Austria" },
  { city: "Zwettl", country: "Austria" },
  { city: "Hartberg", country: "Austria" },
  { city: "Leibnitz", country: "Austria" },
  { city: "Judenburg", country: "Austria" },
  { city: "Amstetten", country: "Austria" },
  { city: "Gmunden", country: "Austria" },
  { city: "Sankt Veit an der Glan", country: "Austria" },
  { city: "Oberwart", country: "Austria" },
  { city: "Bludenz", country: "Austria" },
  { city: "Neunkirchen", country: "Austria" },
  { city: "Hall in Tirol", country: "Austria" },
  { city: "Korneuburg", country: "Austria" },
  { city: "Stockerau", country: "Austria" },
  { city: "Traun", country: "Austria" },
  { city: "Leonding", country: "Austria" },
  { city: "Braunau am Inn", country: "Austria" },
  { city: "Mödling", country: "Austria" },
  { city: "Bad Ischl", country: "Austria" },
  { city: "Schladming", country: "Austria" },
  { city: "Mayrhofen", country: "Austria" },
  { city: "St. Anton", country: "Austria" },
  // Switzerland
  { city: "Zurich", country: "Switzerland" },
  { city: "Geneva", country: "Switzerland" },
  { city: "Basel", country: "Switzerland" },
  { city: "Bern", country: "Switzerland" },
  { city: "Lausanne", country: "Switzerland" },
  { city: "Lucerne", country: "Switzerland" },
  { city: "Interlaken", country: "Switzerland" },
  { city: "Lugano", country: "Switzerland" },
  { city: "St. Gallen", country: "Switzerland" },
  { city: "Winterthur", country: "Switzerland" },
  { city: "Davos", country: "Switzerland" },
  { city: "Zermatt", country: "Switzerland" },
  { city: "Biel/Bienne", country: "Switzerland" },
  { city: "Thun", country: "Switzerland" },
  { city: "Köniz", country: "Switzerland" },
  { city: "La Chaux-de-Fonds", country: "Switzerland" },
  { city: "Fribourg", country: "Switzerland" },
  { city: "Uster", country: "Switzerland" },
  { city: "Schaffhausen", country: "Switzerland" },
  { city: "Chur", country: "Switzerland" },
  { city: "Vernier", country: "Switzerland" },
  { city: "Neuchâtel", country: "Switzerland" },
  { city: "Sion", country: "Switzerland" },
  { city: "Emmen", country: "Switzerland" },
  { city: "Kriens", country: "Switzerland" },
  { city: "Rapperswil-Jona", country: "Switzerland" },
  { city: "Aarau", country: "Switzerland" },
  { city: "Dübendorf", country: "Switzerland" },
  { city: "Dietikon", country: "Switzerland" },
  { city: "Wädenswil", country: "Switzerland" },
  { city: "Frauenfeld", country: "Switzerland" },
  { city: "Wettingen", country: "Switzerland" },
  { city: "Montreux", country: "Switzerland" },
  { city: "Locarno", country: "Switzerland" },
  { city: "Baden", country: "Switzerland" },
  { city: "Wohlen", country: "Switzerland" },
  { city: "Olten", country: "Switzerland" },
  { city: "Solothurn", country: "Switzerland" },
  { city: "Bellinzona", country: "Switzerland" },
  { city: "Yverdon-les-Bains", country: "Switzerland" },
  { city: "Nyon", country: "Switzerland" },
  { city: "St. Moritz", country: "Switzerland" },
  { city: "Grindelwald", country: "Switzerland" },
  { city: "Verbier", country: "Switzerland" },
  { city: "Wengen", country: "Switzerland" },
  { city: "Arosa", country: "Switzerland" },
  { city: "Engelberg", country: "Switzerland" },
  { city: "Gstaad", country: "Switzerland" },
  { city: "Saas-Fee", country: "Switzerland" },
  { city: "Mürren", country: "Switzerland" },
  { city: "Ascona", country: "Switzerland" },
  { city: "Lancy", country: "Switzerland" },
  { city: "Meyrin", country: "Switzerland" },
  { city: "Carouge", country: "Switzerland" },
  { city: "Renens", country: "Switzerland" },
  { city: "Morges", country: "Switzerland" },
  { city: "Vevey", country: "Switzerland" },
  { city: "Bulle", country: "Switzerland" },
  { city: "Delémont", country: "Switzerland" },
  { city: "Langenthal", country: "Switzerland" },
  { city: "Burgdorf", country: "Switzerland" },
  { city: "Lyss", country: "Switzerland" },
  { city: "Herisau", country: "Switzerland" },
  { city: "Appenzell", country: "Switzerland" },
  { city: "Liestal", country: "Switzerland" },
  { city: "Rheinfelden", country: "Switzerland" },
  { city: "Horgen", country: "Switzerland" },
  { city: "Kloten", country: "Switzerland" },
  { city: "Kreuzlingen", country: "Switzerland" },
  { city: "Romanshorn", country: "Switzerland" },
  { city: "Buchs", country: "Switzerland" },
  { city: "Sargans", country: "Switzerland" },
  { city: "Ilanz", country: "Switzerland" },
  { city: "Martigny", country: "Switzerland" },
  { city: "Brig", country: "Switzerland" },
  { city: "Visp", country: "Switzerland" },
  { city: "Sierre", country: "Switzerland" },
  { city: "Crans-Montana", country: "Switzerland" },
  { city: "Aigle", country: "Switzerland" },
  { city: "Mendrisio", country: "Switzerland" },
  { city: "Chiasso", country: "Switzerland" },
  // Greece
  { city: "Athens", country: "Greece" },
  { city: "Thessaloniki", country: "Greece" },
  { city: "Santorini", country: "Greece" },
  { city: "Mykonos", country: "Greece" },
  { city: "Crete", country: "Greece" },
  { city: "Patras", country: "Greece" },
  { city: "Rhodes", country: "Greece" },
  { city: "Corfu", country: "Greece" },
  { city: "Volos", country: "Greece" },
  { city: "Larissa", country: "Greece" },
  { city: "Heraklion", country: "Greece" },
  { city: "Zakynthos", country: "Greece" },
  { city: "Ioannina", country: "Greece" },
  { city: "Kavala", country: "Greece" },
  { city: "Piraeus", country: "Greece" },
  { city: "Chania", country: "Greece" },
  { city: "Rethymno", country: "Greece" },
  { city: "Kalamata", country: "Greece" },
  { city: "Alexandroupoli", country: "Greece" },
  { city: "Serres", country: "Greece" },
  { city: "Drama", country: "Greece" },
  { city: "Xanthi", country: "Greece" },
  { city: "Komotini", country: "Greece" },
  { city: "Trikala", country: "Greece" },
  { city: "Katerini", country: "Greece" },
  { city: "Veria", country: "Greece" },
  { city: "Kozani", country: "Greece" },
  { city: "Chalcis", country: "Greece" },
  { city: "Lamia", country: "Greece" },
  { city: "Agrinio", country: "Greece" },
  { city: "Kos", country: "Greece" },
  { city: "Lefkada", country: "Greece" },
  { city: "Kefalonia", country: "Greece" },
  { city: "Paros", country: "Greece" },
  { city: "Naxos", country: "Greece" },
  { city: "Milos", country: "Greece" },
  { city: "Samos", country: "Greece" },
  { city: "Chios", country: "Greece" },
  { city: "Lesbos", country: "Greece" },
  { city: "Skiathos", country: "Greece" },
  { city: "Thassos", country: "Greece" },
  { city: "Hydra", country: "Greece" },
  { city: "Aegina", country: "Greece" },
  { city: "Nafplio", country: "Greece" },
  { city: "Tripoli", country: "Greece" },
  { city: "Sparti", country: "Greece" },
  { city: "Messini", country: "Greece" },
  { city: "Pyrgos", country: "Greece" },
  { city: "Preveza", country: "Greece" },
  { city: "Kastoria", country: "Greece" },
  { city: "Florina", country: "Greece" },
  { city: "Edessa", country: "Greece" },
  { city: "Giannitsa", country: "Greece" },
  { city: "Kilkis", country: "Greece" },
  { city: "Polygyros", country: "Greece" },
  { city: "Chalkidiki", country: "Greece" },
  { city: "Meteora", country: "Greece" },
  { city: "Delphi", country: "Greece" },
  { city: "Olympia", country: "Greece" },
  { city: "Corinth", country: "Greece" },
  { city: "Ermoupoli", country: "Greece" },
  { city: "Leros", country: "Greece" },
  { city: "Karpathos", country: "Greece" },
  { city: "Ithaca", country: "Greece" },
  { city: "Paxos", country: "Greece" },
  { city: "Ikaria", country: "Greece" },
  { city: "Ios", country: "Greece" },
  { city: "Amorgos", country: "Greece" },
  { city: "Antiparos", country: "Greece" },
  { city: "Skopelos", country: "Greece" },
  { city: "Alonissos", country: "Greece" },
  { city: "Kalymnos", country: "Greece" },
  { city: "Syros", country: "Greece" },
  { city: "Tinos", country: "Greece" },
  { city: "Andros", country: "Greece" },
  { city: "Lemnos", country: "Greece" },
  { city: "Skyros", country: "Greece" },
  { city: "Sitia", country: "Greece" },
  { city: "Ierapetra", country: "Greece" },
  { city: "Agios Nikolaos", country: "Greece" },
  { city: "Hersonissos", country: "Greece" },
  { city: "Malia", country: "Greece" },
  { city: "Elounda", country: "Greece" },
  { city: "Thessaly", country: "Greece" },
  { city: "Parga", country: "Greece" },
  { city: "Metsovo", country: "Greece" },
  { city: "Arachova", country: "Greece" },
  { city: "Monemvasia", country: "Greece" },
  { city: "Porto Heli", country: "Greece" },
  { city: "Marathon", country: "Greece" },
  { city: "Glyfada", country: "Greece" },
  { city: "Vouliagmeni", country: "Greece" },
  { city: "Kifissia", country: "Greece" },
  { city: "Marousi", country: "Greece" },
  { city: "Peristeri", country: "Greece" },
  { city: "Nikaia", country: "Greece" },
  { city: "Kallithea", country: "Greece" },
  { city: "Nea Smyrni", country: "Greece" },
  { city: "Rafina", country: "Greece" },
  // Turkey
  { city: "Istanbul", country: "Turkey" },
  { city: "Ankara", country: "Turkey" },
  { city: "Antalya", country: "Turkey" },
  { city: "Izmir", country: "Turkey" },
  { city: "Bodrum", country: "Turkey" },
  { city: "Bursa", country: "Turkey" },
  { city: "Adana", country: "Turkey" },
  { city: "Trabzon", country: "Turkey" },
  { city: "Gaziantep", country: "Turkey" },
  { city: "Konya", country: "Turkey" },
  { city: "Kayseri", country: "Turkey" },
  { city: "Mersin", country: "Turkey" },
  { city: "Eskişehir", country: "Turkey" },
  { city: "Diyarbakır", country: "Turkey" },
  { city: "Samsun", country: "Turkey" },
  { city: "Fethiye", country: "Turkey" },
  // Poland
  { city: "Warsaw", country: "Poland" },
  { city: "Krakow", country: "Poland" },
  { city: "Wroclaw", country: "Poland" },
  { city: "Gdansk", country: "Poland" },
  { city: "Poznan", country: "Poland" },
  { city: "Lodz", country: "Poland" },
  { city: "Katowice", country: "Poland" },
  { city: "Szczecin", country: "Poland" },
  { city: "Lublin", country: "Poland" },
  { city: "Bydgoszcz", country: "Poland" },
  { city: "Bialystok", country: "Poland" },
  { city: "Torun", country: "Poland" },
  { city: "Rzeszow", country: "Poland" },
  { city: "Sopot", country: "Poland" },
  // Czech Republic
  { city: "Prague", country: "Czech Republic" },
  { city: "Brno", country: "Czech Republic" },
  { city: "Ostrava", country: "Czech Republic" },
  { city: "Plzen", country: "Czech Republic" },
  { city: "Liberec", country: "Czech Republic" },
  { city: "Olomouc", country: "Czech Republic" },
  { city: "Cesky Krumlov", country: "Czech Republic" },
  { city: "Karlovy Vary", country: "Czech Republic" },
  // Slovakia
  { city: "Bratislava", country: "Slovakia" },
  { city: "Kosice", country: "Slovakia" },
  { city: "Zilina", country: "Slovakia" },
  { city: "Nitra", country: "Slovakia" },
  { city: "Banska Bystrica", country: "Slovakia" },
  { city: "Presov", country: "Slovakia" },
  // Hungary
  { city: "Budapest", country: "Hungary" },
  { city: "Debrecen", country: "Hungary" },
  { city: "Szeged", country: "Hungary" },
  { city: "Pécs", country: "Hungary" },
  { city: "Miskolc", country: "Hungary" },
  { city: "Győr", country: "Hungary" },
  { city: "Eger", country: "Hungary" },
  // Romania
  { city: "Bucharest", country: "Romania" },
  { city: "Cluj-Napoca", country: "Romania" },
  { city: "Timisoara", country: "Romania" },
  { city: "Iasi", country: "Romania" },
  { city: "Constanta", country: "Romania" },
  { city: "Brasov", country: "Romania" },
  { city: "Sibiu", country: "Romania" },
  { city: "Craiova", country: "Romania" },
  { city: "Oradea", country: "Romania" },
  { city: "Galati", country: "Romania" },
  // Bulgaria
  { city: "Sofia", country: "Bulgaria" },
  { city: "Plovdiv", country: "Bulgaria" },
  { city: "Varna", country: "Bulgaria" },
  { city: "Burgas", country: "Bulgaria" },
  { city: "Ruse", country: "Bulgaria" },
  { city: "Veliko Tarnovo", country: "Bulgaria" },
  { city: "Stara Zagora", country: "Bulgaria" },
  // Croatia
  { city: "Zagreb", country: "Croatia" },
  { city: "Split", country: "Croatia" },
  { city: "Dubrovnik", country: "Croatia" },
  { city: "Rijeka", country: "Croatia" },
  { city: "Zadar", country: "Croatia" },
  { city: "Pula", country: "Croatia" },
  { city: "Osijek", country: "Croatia" },
  // Slovenia
  { city: "Ljubljana", country: "Slovenia" },
  { city: "Maribor", country: "Slovenia" },
  { city: "Bled", country: "Slovenia" },
  { city: "Celje", country: "Slovenia" },
  // Serbia
  { city: "Belgrade", country: "Serbia" },
  { city: "Novi Sad", country: "Serbia" },
  { city: "Niš", country: "Serbia" },
  { city: "Kragujevac", country: "Serbia" },
  { city: "Subotica", country: "Serbia" },
  // Bosnia & Herzegovina
  { city: "Sarajevo", country: "Bosnia & Herzegovina" },
  { city: "Mostar", country: "Bosnia & Herzegovina" },
  { city: "Banja Luka", country: "Bosnia & Herzegovina" },
  { city: "Tuzla", country: "Bosnia & Herzegovina" },
  // Montenegro
  { city: "Podgorica", country: "Montenegro" },
  { city: "Budva", country: "Montenegro" },
  { city: "Kotor", country: "Montenegro" },
  { city: "Tivat", country: "Montenegro" },
  { city: "Bar", country: "Montenegro" },
  // North Macedonia
  { city: "Skopje", country: "North Macedonia" },
  { city: "Ohrid", country: "North Macedonia" },
  { city: "Bitola", country: "North Macedonia" },
  { city: "Kumanovo", country: "North Macedonia" },
  { city: "Prilep", country: "North Macedonia" },
  { city: "Tetovo", country: "North Macedonia" },
  { city: "Veles", country: "North Macedonia" },
  { city: "Štip", country: "North Macedonia" },
  { city: "Strumica", country: "North Macedonia" },
  { city: "Gostivar", country: "North Macedonia" },
  { city: "Kičevo", country: "North Macedonia" },
  { city: "Kavadarci", country: "North Macedonia" },
  { city: "Kočani", country: "North Macedonia" },
  { city: "Struga", country: "North Macedonia" },
  { city: "Gevgelija", country: "North Macedonia" },
  { city: "Negotino", country: "North Macedonia" },
  { city: "Debar", country: "North Macedonia" },
  { city: "Delčevo", country: "North Macedonia" },
  { city: "Sveti Nikole", country: "North Macedonia" },
  { city: "Radoviš", country: "North Macedonia" },
  { city: "Berovo", country: "North Macedonia" },
  { city: "Kratovo", country: "North Macedonia" },
  { city: "Resen", country: "North Macedonia" },
  { city: "Krusevo", country: "North Macedonia" },
  { city: "Demir Hisar", country: "North Macedonia" },
  { city: "Makedonski Brod", country: "North Macedonia" },
  { city: "Probištip", country: "North Macedonia" },
  { city: "Vinica", country: "North Macedonia" },
  { city: "Bogdanci", country: "North Macedonia" },
  { city: "Valandovo", country: "North Macedonia" },
  { city: "Demir Kapija", country: "North Macedonia" },
  { city: "Mavrovo", country: "North Macedonia" },
  // Albania
  { city: "Tirana", country: "Albania" },
  { city: "Durrës", country: "Albania" },
  { city: "Vlorë", country: "Albania" },
  { city: "Sarandë", country: "Albania" },
  { city: "Shkodër", country: "Albania" },
  { city: "Elbasan", country: "Albania" },
  { city: "Korçë", country: "Albania" },
  { city: "Fier", country: "Albania" },
  { city: "Berat", country: "Albania" },
  { city: "Lushnjë", country: "Albania" },
  { city: "Pogradec", country: "Albania" },
  { city: "Kavajë", country: "Albania" },
  { city: "Gjirokastër", country: "Albania" },
  { city: "Kukës", country: "Albania" },
  { city: "Lezhë", country: "Albania" },
  { city: "Peshkopi", country: "Albania" },
  { city: "Bulqizë", country: "Albania" },
  { city: "Gramsh", country: "Albania" },
  { city: "Librazhd", country: "Albania" },
  { city: "Tepelenë", country: "Albania" },
  { city: "Përmet", country: "Albania" },
  { city: "Pukë", country: "Albania" },
  { city: "Krujë", country: "Albania" },
  { city: "Laç", country: "Albania" },
  { city: "Burrel", country: "Albania" },
  { city: "Ksamil", country: "Albania" },
  { city: "Himarë", country: "Albania" },
  { city: "Divjakë", country: "Albania" },
  { city: "Bajzë", country: "Albania" },
  { city: "Shijak", country: "Albania" },
  { city: "Koplik", country: "Albania" },
  { city: "Thumanë", country: "Albania" },
  { city: "Rrogozhinë", country: "Albania" },
  { city: "Peqin", country: "Albania" },
  { city: "Cërrik", country: "Albania" },
  { city: "Kuçovë", country: "Albania" },
  { city: "Ballsh", country: "Albania" },
  { city: "Selenicë", country: "Albania" },
  { city: "Orikum", country: "Albania" },
  { city: "Delvinë", country: "Albania" },
  { city: "Konispol", country: "Albania" },
  { city: "Ersekë", country: "Albania" },
  { city: "Bilisht", country: "Albania" },
  { city: "Maliq", country: "Albania" },
  { city: "Corovodë", country: "Albania" },
  { city: "Memaliaj", country: "Albania" },
  { city: "Këlcyrë", country: "Albania" },
  { city: "Skrapar", country: "Albania" },
  { city: "Rubik", country: "Albania" },
  { city: "Rrëshen", country: "Albania" },
  { city: "Mamurras", country: "Albania" },
  { city: "Fushë-Krujë", country: "Albania" },
  // Kosovo
  { city: "Pristina", country: "Kosovo" },
  { city: "Prizren", country: "Kosovo" },
  { city: "Peja", country: "Kosovo" },
  { city: "Mitrovica", country: "Kosovo" },
  { city: "Ferizaj", country: "Kosovo" },
  { city: "Gjilan", country: "Kosovo" },
  { city: "Gjakova", country: "Kosovo" },
  { city: "Podujevo", country: "Kosovo" },
  { city: "Vushtrri", country: "Kosovo" },
  { city: "Suhareka", country: "Kosovo" },
  { city: "Rahovec", country: "Kosovo" },
  { city: "Drenas", country: "Kosovo" },
  { city: "Lipjan", country: "Kosovo" },
  { city: "Malisheva", country: "Kosovo" },
  { city: "Kamenica", country: "Kosovo" },
  { city: "Viti", country: "Kosovo" },
  { city: "Deçan", country: "Kosovo" },
  { city: "Istog", country: "Kosovo" },
  { city: "Klina", country: "Kosovo" },
  { city: "Skenderaj", country: "Kosovo" },
  { city: "Kaçanik", country: "Kosovo" },
  { city: "Shtime", country: "Kosovo" },
  { city: "Fushë Kosovë", country: "Kosovo" },
  { city: "Obiliq", country: "Kosovo" },
  { city: "Dragash", country: "Kosovo" },
  { city: "Shtërpcë", country: "Kosovo" },
  { city: "Novobërdë", country: "Kosovo" },
  { city: "Hani i Elezit", country: "Kosovo" },
  { city: "Junik", country: "Kosovo" },
  { city: "Mamushë", country: "Kosovo" },
  { city: "Graçanicë", country: "Kosovo" },
  { city: "Ranillug", country: "Kosovo" },
  { city: "Kllokot", country: "Kosovo" },
  { city: "Partesh", country: "Kosovo" },
  { city: "Zubin Potok", country: "Kosovo" },
  { city: "Zveçan", country: "Kosovo" },
  { city: "Leposaviq", country: "Kosovo" },
  // Moldova
  { city: "Chisinau", country: "Moldova" },
  { city: "Balti", country: "Moldova" },
  // Ukraine
  { city: "Kyiv", country: "Ukraine" },
  { city: "Lviv", country: "Ukraine" },
  { city: "Odesa", country: "Ukraine" },
  { city: "Kharkiv", country: "Ukraine" },
  { city: "Dnipro", country: "Ukraine" },
  { city: "Zaporizhzhia", country: "Ukraine" },
  { city: "Mykolaiv", country: "Ukraine" },
  { city: "Vinnytsia", country: "Ukraine" },
  // Belarus
  { city: "Minsk", country: "Belarus" },
  { city: "Gomel", country: "Belarus" },
  { city: "Grodno", country: "Belarus" },
  { city: "Brest", country: "Belarus" },
  { city: "Vitebsk", country: "Belarus" },
  // Russia
  { city: "Moscow", country: "Russia" },
  { city: "St. Petersburg", country: "Russia" },
  { city: "Kazan", country: "Russia" },
  { city: "Sochi", country: "Russia" },
  { city: "Novosibirsk", country: "Russia" },
  { city: "Yekaterinburg", country: "Russia" },
  { city: "Nizhny Novgorod", country: "Russia" },
  { city: "Samara", country: "Russia" },
  { city: "Rostov-on-Don", country: "Russia" },
  { city: "Chelyabinsk", country: "Russia" },
  { city: "Ufa", country: "Russia" },
  { city: "Krasnoyarsk", country: "Russia" },
  { city: "Voronezh", country: "Russia" },
  { city: "Vladivostok", country: "Russia" },
  { city: "Krasnodar", country: "Russia" },
  { city: "Kaliningrad", country: "Russia" },
  { city: "Omsk", country: "Russia" },
  { city: "Perm", country: "Russia" },
  { city: "Volgograd", country: "Russia" },
  { city: "Irkutsk", country: "Russia" },
  // Sweden
  { city: "Stockholm", country: "Sweden" },
  { city: "Gothenburg", country: "Sweden" },
  { city: "Malmö", country: "Sweden" },
  { city: "Uppsala", country: "Sweden" },
  { city: "Linköping", country: "Sweden" },
  { city: "Örebro", country: "Sweden" },
  { city: "Västerås", country: "Sweden" },
  { city: "Umeå", country: "Sweden" },
  { city: "Lund", country: "Sweden" },
  // Norway
  { city: "Oslo", country: "Norway" },
  { city: "Bergen", country: "Norway" },
  { city: "Tromsø", country: "Norway" },
  { city: "Trondheim", country: "Norway" },
  { city: "Stavanger", country: "Norway" },
  { city: "Kristiansand", country: "Norway" },
  { city: "Drammen", country: "Norway" },
  { city: "Fredrikstad", country: "Norway" },
  { city: "Bodø", country: "Norway" },
  // Denmark
  { city: "Copenhagen", country: "Denmark" },
  { city: "Aarhus", country: "Denmark" },
  { city: "Odense", country: "Denmark" },
  { city: "Aalborg", country: "Denmark" },
  { city: "Esbjerg", country: "Denmark" },
  { city: "Roskilde", country: "Denmark" },
  // Finland
  { city: "Helsinki", country: "Finland" },
  { city: "Tampere", country: "Finland" },
  { city: "Turku", country: "Finland" },
  { city: "Oulu", country: "Finland" },
  { city: "Espoo", country: "Finland" },
  { city: "Rovaniemi", country: "Finland" },
  { city: "Jyväskylä", country: "Finland" },
  // Iceland
  { city: "Reykjavik", country: "Iceland" },
  { city: "Akureyri", country: "Iceland" },
  // Ireland
  { city: "Dublin", country: "Ireland" },
  { city: "Cork", country: "Ireland" },
  { city: "Galway", country: "Ireland" },
  { city: "Limerick", country: "Ireland" },
  { city: "Waterford", country: "Ireland" },
  { city: "Killarney", country: "Ireland" },
  // Estonia
  { city: "Tallinn", country: "Estonia" },
  { city: "Tartu", country: "Estonia" },
  { city: "Pärnu", country: "Estonia" },
  // Latvia
  { city: "Riga", country: "Latvia" },
  { city: "Daugavpils", country: "Latvia" },
  { city: "Liepaja", country: "Latvia" },
  { city: "Jurmala", country: "Latvia" },
  // Lithuania
  { city: "Vilnius", country: "Lithuania" },
  { city: "Kaunas", country: "Lithuania" },
  { city: "Klaipeda", country: "Lithuania" },
  { city: "Siauliai", country: "Lithuania" },
  // Cyprus
  { city: "Nicosia", country: "Cyprus" },
  { city: "Limassol", country: "Cyprus" },
  { city: "Larnaca", country: "Cyprus" },
  { city: "Paphos", country: "Cyprus" },
  { city: "Ayia Napa", country: "Cyprus" },
  // Malta
  { city: "Valletta", country: "Malta" },
  { city: "Sliema", country: "Malta" },
  { city: "St. Julian's", country: "Malta" },
  // Monaco
  { city: "Monaco", country: "Monaco" },
  // Andorra
  { city: "Andorra la Vella", country: "Andorra" },
  // Liechtenstein
  { city: "Vaduz", country: "Liechtenstein" },
  // San Marino
  { city: "San Marino", country: "San Marino" },
  // Georgia
  { city: "Tbilisi", country: "Georgia" },
  { city: "Batumi", country: "Georgia" },
  { city: "Kutaisi", country: "Georgia" },
  { city: "Rustavi", country: "Georgia" },
  // Armenia
  { city: "Yerevan", country: "Armenia" },
  { city: "Gyumri", country: "Armenia" },
  { city: "Vanadzor", country: "Armenia" },
  // Azerbaijan
  { city: "Baku", country: "Azerbaijan" },
  { city: "Ganja", country: "Azerbaijan" },
  { city: "Sumqayit", country: "Azerbaijan" },

  // ============================================================
  // NORTH AMERICA
  // ============================================================
  // USA
  { city: "New York", country: "USA" },
  { city: "Los Angeles", country: "USA" },
  { city: "Chicago", country: "USA" },
  { city: "Houston", country: "USA" },
  { city: "Miami", country: "USA" },
  { city: "San Francisco", country: "USA" },
  { city: "Las Vegas", country: "USA" },
  { city: "Seattle", country: "USA" },
  { city: "Boston", country: "USA" },
  { city: "Atlanta", country: "USA" },
  { city: "Dallas", country: "USA" },
  { city: "Washington D.C.", country: "USA" },
  { city: "Denver", country: "USA" },
  { city: "Phoenix", country: "USA" },
  { city: "San Diego", country: "USA" },
  { city: "Philadelphia", country: "USA" },
  { city: "Nashville", country: "USA" },
  { city: "Austin", country: "USA" },
  { city: "New Orleans", country: "USA" },
  { city: "Portland", country: "USA" },
  { city: "Honolulu", country: "USA" },
  { city: "Detroit", country: "USA" },
  { city: "Minneapolis", country: "USA" },
  { city: "San Antonio", country: "USA" },
  { city: "Orlando", country: "USA" },
  { city: "Tampa", country: "USA" },
  { city: "Charlotte", country: "USA" },
  { city: "Baltimore", country: "USA" },
  { city: "Salt Lake City", country: "USA" },
  { city: "Indianapolis", country: "USA" },
  { city: "Columbus", country: "USA" },
  { city: "Kansas City", country: "USA" },
  { city: "Milwaukee", country: "USA" },
  { city: "Cincinnati", country: "USA" },
  { city: "Raleigh", country: "USA" },
  { city: "Memphis", country: "USA" },
  { city: "Pittsburgh", country: "USA" },
  { city: "Sacramento", country: "USA" },
  { city: "San Jose", country: "USA" },
  { city: "Jacksonville", country: "USA" },
  { city: "Fort Worth", country: "USA" },
  { city: "Oklahoma City", country: "USA" },
  { city: "Tucson", country: "USA" },
  { city: "El Paso", country: "USA" },
  { city: "Albuquerque", country: "USA" },
  { city: "Louisville", country: "USA" },
  { city: "Richmond", country: "USA" },
  { city: "Savannah", country: "USA" },
  { city: "Charleston", country: "USA" },
  { city: "Anchorage", country: "USA" },
  { city: "Boise", country: "USA" },
  { city: "Buffalo", country: "USA" },
  { city: "Hartford", country: "USA" },
  { city: "Providence", country: "USA" },
  { city: "St. Louis", country: "USA" },
  { city: "Cleveland", country: "USA" },
  { city: "Fort Lauderdale", country: "USA" },
  { city: "Virginia Beach", country: "USA" },
  // Canada
  { city: "Toronto", country: "Canada" },
  { city: "Vancouver", country: "Canada" },
  { city: "Montreal", country: "Canada" },
  { city: "Calgary", country: "Canada" },
  { city: "Ottawa", country: "Canada" },
  { city: "Edmonton", country: "Canada" },
  { city: "Quebec City", country: "Canada" },
  { city: "Winnipeg", country: "Canada" },
  { city: "Hamilton", country: "Canada" },
  { city: "Halifax", country: "Canada" },
  { city: "Victoria", country: "Canada" },
  { city: "Saskatoon", country: "Canada" },
  { city: "Regina", country: "Canada" },
  { city: "St. John's", country: "Canada" },
  { city: "Kelowna", country: "Canada" },
  { city: "Kitchener", country: "Canada" },
  { city: "London", country: "Canada" },
  { city: "Windsor", country: "Canada" },
  { city: "Niagara Falls", country: "Canada" },
  { city: "Mississauga", country: "Canada" },
  { city: "Brampton", country: "Canada" },
  { city: "Whistler", country: "Canada" },
  // Mexico
  { city: "Mexico City", country: "Mexico" },
  { city: "Cancún", country: "Mexico" },
  { city: "Guadalajara", country: "Mexico" },
  { city: "Monterrey", country: "Mexico" },
  { city: "Playa del Carmen", country: "Mexico" },
  { city: "Tijuana", country: "Mexico" },
  { city: "Puebla", country: "Mexico" },
  { city: "Mérida", country: "Mexico" },
  { city: "León", country: "Mexico" },
  { city: "Querétaro", country: "Mexico" },
  { city: "San Miguel de Allende", country: "Mexico" },
  { city: "Oaxaca", country: "Mexico" },
  { city: "Puerto Vallarta", country: "Mexico" },
  { city: "Cabo San Lucas", country: "Mexico" },
  { city: "Juárez", country: "Mexico" },
  { city: "Toluca", country: "Mexico" },
  { city: "Chihuahua", country: "Mexico" },
  { city: "Aguascalientes", country: "Mexico" },
  { city: "Morelia", country: "Mexico" },
  { city: "Acapulco", country: "Mexico" },
  { city: "Veracruz", country: "Mexico" },
  { city: "Mazatlán", country: "Mexico" },
  { city: "Tulum", country: "Mexico" },
  // Cuba
  { city: "Havana", country: "Cuba" },
  { city: "Santiago de Cuba", country: "Cuba" },
  { city: "Trinidad", country: "Cuba" },
  { city: "Varadero", country: "Cuba" },
  { city: "Camagüey", country: "Cuba" },
  // Dominican Republic
  { city: "Santo Domingo", country: "Dominican Republic" },
  { city: "Punta Cana", country: "Dominican Republic" },
  { city: "Santiago", country: "Dominican Republic" },
  { city: "Puerto Plata", country: "Dominican Republic" },
  { city: "La Romana", country: "Dominican Republic" },
  // Puerto Rico
  { city: "San Juan", country: "Puerto Rico" },
  { city: "Ponce", country: "Puerto Rico" },
  { city: "Mayagüez", country: "Puerto Rico" },
  // Jamaica
  { city: "Kingston", country: "Jamaica" },
  { city: "Montego Bay", country: "Jamaica" },
  { city: "Ocho Rios", country: "Jamaica" },
  { city: "Negril", country: "Jamaica" },
  // Bahamas
  { city: "Nassau", country: "Bahamas" },
  { city: "Freeport", country: "Bahamas" },
  // Trinidad & Tobago
  { city: "Port of Spain", country: "Trinidad & Tobago" },
  { city: "San Fernando", country: "Trinidad & Tobago" },
  // Barbados
  { city: "Bridgetown", country: "Barbados" },
  // Haiti
  { city: "Port-au-Prince", country: "Haiti" },
  { city: "Cap-Haïtien", country: "Haiti" },
  // Guatemala
  { city: "Guatemala City", country: "Guatemala" },
  { city: "Antigua Guatemala", country: "Guatemala" },
  { city: "Quetzaltenango", country: "Guatemala" },
  // El Salvador
  { city: "San Salvador", country: "El Salvador" },
  { city: "Santa Ana", country: "El Salvador" },
  // Honduras
  { city: "Tegucigalpa", country: "Honduras" },
  { city: "San Pedro Sula", country: "Honduras" },
  { city: "La Ceiba", country: "Honduras" },
  { city: "Roatán", country: "Honduras" },
  // Costa Rica
  { city: "San José", country: "Costa Rica" },
  { city: "Liberia", country: "Costa Rica" },
  { city: "Puerto Limón", country: "Costa Rica" },
  { city: "Tamarindo", country: "Costa Rica" },
  // Panama
  { city: "Panama City", country: "Panama" },
  { city: "Colón", country: "Panama" },
  { city: "David", country: "Panama" },
  { city: "Bocas del Toro", country: "Panama" },
  // Nicaragua
  { city: "Managua", country: "Nicaragua" },
  { city: "Granada", country: "Nicaragua" },
  { city: "León", country: "Nicaragua" },
  { city: "San Juan del Sur", country: "Nicaragua" },
  // Belize
  { city: "Belize City", country: "Belize" },
  { city: "San Pedro", country: "Belize" },
  { city: "Belmopan", country: "Belize" },
  // Other Caribbean
  { city: "Willemstad", country: "Curaçao" },
  { city: "Oranjestad", country: "Aruba" },
  { city: "Philipsburg", country: "Sint Maarten" },
  { city: "Basseterre", country: "Saint Kitts & Nevis" },
  { city: "St. George's", country: "Grenada" },
  { city: "Castries", country: "Saint Lucia" },
  { city: "Kingstown", country: "Saint Vincent" },
  { city: "Roseau", country: "Dominica" },
  { city: "St. John's", country: "Antigua & Barbuda" },
  { city: "George Town", country: "Cayman Islands" },
  { city: "Hamilton", country: "Bermuda" },
  { city: "Road Town", country: "British Virgin Islands" },
  { city: "Charlotte Amalie", country: "U.S. Virgin Islands" },

  // ============================================================
  // SOUTH AMERICA
  // ============================================================
  // Brazil
  { city: "São Paulo", country: "Brazil" },
  { city: "Rio de Janeiro", country: "Brazil" },
  { city: "Brasília", country: "Brazil" },
  { city: "Salvador", country: "Brazil" },
  { city: "Fortaleza", country: "Brazil" },
  { city: "Belo Horizonte", country: "Brazil" },
  { city: "Curitiba", country: "Brazil" },
  { city: "Recife", country: "Brazil" },
  { city: "Manaus", country: "Brazil" },
  { city: "Belém", country: "Brazil" },
  { city: "Porto Alegre", country: "Brazil" },
  { city: "Florianópolis", country: "Brazil" },
  { city: "Goiânia", country: "Brazil" },
  { city: "Natal", country: "Brazil" },
  { city: "Campinas", country: "Brazil" },
  { city: "São Luís", country: "Brazil" },
  { city: "Maceió", country: "Brazil" },
  { city: "João Pessoa", country: "Brazil" },
  { city: "Vitória", country: "Brazil" },
  { city: "Santos", country: "Brazil" },
  { city: "Búzios", country: "Brazil" },
  { city: "Foz do Iguaçu", country: "Brazil" },
  // Argentina
  { city: "Buenos Aires", country: "Argentina" },
  { city: "Córdoba", country: "Argentina" },
  { city: "Mendoza", country: "Argentina" },
  { city: "Rosario", country: "Argentina" },
  { city: "Bariloche", country: "Argentina" },
  { city: "Salta", country: "Argentina" },
  { city: "Mar del Plata", country: "Argentina" },
  { city: "Tucumán", country: "Argentina" },
  { city: "La Plata", country: "Argentina" },
  { city: "Ushuaia", country: "Argentina" },
  { city: "El Calafate", country: "Argentina" },
  { city: "Neuquén", country: "Argentina" },
  // Colombia
  { city: "Bogotá", country: "Colombia" },
  { city: "Medellín", country: "Colombia" },
  { city: "Cartagena", country: "Colombia" },
  { city: "Cali", country: "Colombia" },
  { city: "Barranquilla", country: "Colombia" },
  { city: "Santa Marta", country: "Colombia" },
  { city: "Bucaramanga", country: "Colombia" },
  { city: "Pereira", country: "Colombia" },
  { city: "Manizales", country: "Colombia" },
  { city: "San Andrés", country: "Colombia" },
  // Peru
  { city: "Lima", country: "Peru" },
  { city: "Cusco", country: "Peru" },
  { city: "Arequipa", country: "Peru" },
  { city: "Trujillo", country: "Peru" },
  { city: "Iquitos", country: "Peru" },
  { city: "Piura", country: "Peru" },
  { city: "Huancayo", country: "Peru" },
  // Chile
  { city: "Santiago", country: "Chile" },
  { city: "Valparaíso", country: "Chile" },
  { city: "Concepción", country: "Chile" },
  { city: "Viña del Mar", country: "Chile" },
  { city: "Antofagasta", country: "Chile" },
  { city: "Temuco", country: "Chile" },
  { city: "La Serena", country: "Chile" },
  { city: "Puerto Montt", country: "Chile" },
  { city: "Punta Arenas", country: "Chile" },
  { city: "Iquique", country: "Chile" },
  // Ecuador
  { city: "Quito", country: "Ecuador" },
  { city: "Guayaquil", country: "Ecuador" },
  { city: "Cuenca", country: "Ecuador" },
  { city: "Galápagos", country: "Ecuador" },
  { city: "Ambato", country: "Ecuador" },
  { city: "Manta", country: "Ecuador" },
  // Venezuela
  { city: "Caracas", country: "Venezuela" },
  { city: "Maracaibo", country: "Venezuela" },
  { city: "Valencia", country: "Venezuela" },
  { city: "Barquisimeto", country: "Venezuela" },
  { city: "Mérida", country: "Venezuela" },
  { city: "Margarita Island", country: "Venezuela" },
  // Uruguay
  { city: "Montevideo", country: "Uruguay" },
  { city: "Punta del Este", country: "Uruguay" },
  { city: "Colonia del Sacramento", country: "Uruguay" },
  { city: "Salto", country: "Uruguay" },
  // Paraguay
  { city: "Asunción", country: "Paraguay" },
  { city: "Ciudad del Este", country: "Paraguay" },
  { city: "Encarnación", country: "Paraguay" },
  // Bolivia
  { city: "La Paz", country: "Bolivia" },
  { city: "Santa Cruz", country: "Bolivia" },
  { city: "Cochabamba", country: "Bolivia" },
  { city: "Sucre", country: "Bolivia" },
  { city: "Oruro", country: "Bolivia" },
  // Guyana
  { city: "Georgetown", country: "Guyana" },
  // Suriname
  { city: "Paramaribo", country: "Suriname" },
  // French Guiana
  { city: "Cayenne", country: "French Guiana" },

  // ============================================================
  // ASIA
  // ============================================================
  // Japan
  { city: "Tokyo", country: "Japan" },
  { city: "Osaka", country: "Japan" },
  { city: "Kyoto", country: "Japan" },
  { city: "Yokohama", country: "Japan" },
  { city: "Fukuoka", country: "Japan" },
  { city: "Nagoya", country: "Japan" },
  { city: "Sapporo", country: "Japan" },
  { city: "Kobe", country: "Japan" },
  { city: "Hiroshima", country: "Japan" },
  { city: "Sendai", country: "Japan" },
  { city: "Nara", country: "Japan" },
  { city: "Okinawa", country: "Japan" },
  { city: "Nagasaki", country: "Japan" },
  { city: "Kanazawa", country: "Japan" },
  { city: "Kawasaki", country: "Japan" },
  // South Korea
  { city: "Seoul", country: "South Korea" },
  { city: "Busan", country: "South Korea" },
  { city: "Incheon", country: "South Korea" },
  { city: "Daegu", country: "South Korea" },
  { city: "Daejeon", country: "South Korea" },
  { city: "Gwangju", country: "South Korea" },
  { city: "Suwon", country: "South Korea" },
  { city: "Jeju", country: "South Korea" },
  { city: "Ulsan", country: "South Korea" },
  // North Korea
  { city: "Pyongyang", country: "North Korea" },
  // China
  { city: "Shanghai", country: "China" },
  { city: "Beijing", country: "China" },
  { city: "Shenzhen", country: "China" },
  { city: "Guangzhou", country: "China" },
  { city: "Chengdu", country: "China" },
  { city: "Xi'an", country: "China" },
  { city: "Hangzhou", country: "China" },
  { city: "Wuhan", country: "China" },
  { city: "Chongqing", country: "China" },
  { city: "Nanjing", country: "China" },
  { city: "Tianjin", country: "China" },
  { city: "Suzhou", country: "China" },
  { city: "Qingdao", country: "China" },
  { city: "Dalian", country: "China" },
  { city: "Kunming", country: "China" },
  { city: "Xiamen", country: "China" },
  { city: "Harbin", country: "China" },
  { city: "Guilin", country: "China" },
  { city: "Changsha", country: "China" },
  { city: "Zhengzhou", country: "China" },
  { city: "Shenyang", country: "China" },
  { city: "Jinan", country: "China" },
  { city: "Fuzhou", country: "China" },
  { city: "Lhasa", country: "China" },
  { city: "Urumqi", country: "China" },
  // Hong Kong
  { city: "Hong Kong", country: "Hong Kong" },
  // Macau
  { city: "Macau", country: "Macau" },
  // Taiwan
  { city: "Taipei", country: "Taiwan" },
  { city: "Kaohsiung", country: "Taiwan" },
  { city: "Taichung", country: "Taiwan" },
  { city: "Tainan", country: "Taiwan" },
  { city: "Hsinchu", country: "Taiwan" },
  // Mongolia
  { city: "Ulaanbaatar", country: "Mongolia" },
  { city: "Erdenet", country: "Mongolia" },
  // Thailand
  { city: "Bangkok", country: "Thailand" },
  { city: "Phuket", country: "Thailand" },
  { city: "Chiang Mai", country: "Thailand" },
  { city: "Pattaya", country: "Thailand" },
  { city: "Krabi", country: "Thailand" },
  { city: "Koh Samui", country: "Thailand" },
  { city: "Chiang Rai", country: "Thailand" },
  { city: "Hua Hin", country: "Thailand" },
  { city: "Ayutthaya", country: "Thailand" },
  { city: "Hat Yai", country: "Thailand" },
  { city: "Nakhon Ratchasima", country: "Thailand" },
  // Vietnam
  { city: "Ho Chi Minh City", country: "Vietnam" },
  { city: "Hanoi", country: "Vietnam" },
  { city: "Da Nang", country: "Vietnam" },
  { city: "Hoi An", country: "Vietnam" },
  { city: "Nha Trang", country: "Vietnam" },
  { city: "Haiphong", country: "Vietnam" },
  { city: "Hue", country: "Vietnam" },
  { city: "Can Tho", country: "Vietnam" },
  { city: "Da Lat", country: "Vietnam" },
  { city: "Phu Quoc", country: "Vietnam" },
  // Indonesia
  { city: "Jakarta", country: "Indonesia" },
  { city: "Bali", country: "Indonesia" },
  { city: "Surabaya", country: "Indonesia" },
  { city: "Yogyakarta", country: "Indonesia" },
  { city: "Bandung", country: "Indonesia" },
  { city: "Medan", country: "Indonesia" },
  { city: "Makassar", country: "Indonesia" },
  { city: "Semarang", country: "Indonesia" },
  { city: "Lombok", country: "Indonesia" },
  { city: "Palembang", country: "Indonesia" },
  { city: "Manado", country: "Indonesia" },
  { city: "Balikpapan", country: "Indonesia" },
  // Philippines
  { city: "Manila", country: "Philippines" },
  { city: "Cebu", country: "Philippines" },
  { city: "Davao", country: "Philippines" },
  { city: "Quezon City", country: "Philippines" },
  { city: "Boracay", country: "Philippines" },
  { city: "Baguio", country: "Philippines" },
  { city: "Iloilo", country: "Philippines" },
  { city: "Makati", country: "Philippines" },
  { city: "Zamboanga", country: "Philippines" },
  { city: "Palawan", country: "Philippines" },
  { city: "Siargao", country: "Philippines" },
  // Singapore
  { city: "Singapore", country: "Singapore" },
  // Malaysia
  { city: "Kuala Lumpur", country: "Malaysia" },
  { city: "Penang", country: "Malaysia" },
  { city: "Johor Bahru", country: "Malaysia" },
  { city: "Kota Kinabalu", country: "Malaysia" },
  { city: "Langkawi", country: "Malaysia" },
  { city: "Kuching", country: "Malaysia" },
  { city: "Ipoh", country: "Malaysia" },
  { city: "Malacca", country: "Malaysia" },
  { city: "Shah Alam", country: "Malaysia" },
  // Myanmar
  { city: "Yangon", country: "Myanmar" },
  { city: "Mandalay", country: "Myanmar" },
  { city: "Bagan", country: "Myanmar" },
  { city: "Naypyidaw", country: "Myanmar" },
  // Cambodia
  { city: "Phnom Penh", country: "Cambodia" },
  { city: "Siem Reap", country: "Cambodia" },
  { city: "Sihanoukville", country: "Cambodia" },
  { city: "Battambang", country: "Cambodia" },
  // Laos
  { city: "Vientiane", country: "Laos" },
  { city: "Luang Prabang", country: "Laos" },
  { city: "Pakse", country: "Laos" },
  // Brunei
  { city: "Bandar Seri Begawan", country: "Brunei" },
  // East Timor
  { city: "Dili", country: "East Timor" },
  // India
  { city: "Mumbai", country: "India" },
  { city: "Delhi", country: "India" },
  { city: "Bangalore", country: "India" },
  { city: "Kolkata", country: "India" },
  { city: "Chennai", country: "India" },
  { city: "Hyderabad", country: "India" },
  { city: "Goa", country: "India" },
  { city: "Jaipur", country: "India" },
  { city: "Pune", country: "India" },
  { city: "Ahmedabad", country: "India" },
  { city: "Lucknow", country: "India" },
  { city: "Kochi", country: "India" },
  { city: "Varanasi", country: "India" },
  { city: "Chandigarh", country: "India" },
  { city: "Agra", country: "India" },
  { city: "Udaipur", country: "India" },
  { city: "Amritsar", country: "India" },
  { city: "Rishikesh", country: "India" },
  { city: "Shimla", country: "India" },
  { city: "Thiruvananthapuram", country: "India" },
  { city: "Surat", country: "India" },
  { city: "Nagpur", country: "India" },
  { city: "Indore", country: "India" },
  { city: "Bhopal", country: "India" },
  { city: "Coimbatore", country: "India" },
  { city: "Visakhapatnam", country: "India" },
  { city: "Mysore", country: "India" },
  { city: "Mangalore", country: "India" },
  { city: "Jodhpur", country: "India" },
  { city: "Dharamsala", country: "India" },
  // Pakistan
  { city: "Karachi", country: "Pakistan" },
  { city: "Lahore", country: "Pakistan" },
  { city: "Islamabad", country: "Pakistan" },
  { city: "Faisalabad", country: "Pakistan" },
  { city: "Rawalpindi", country: "Pakistan" },
  { city: "Peshawar", country: "Pakistan" },
  { city: "Multan", country: "Pakistan" },
  { city: "Quetta", country: "Pakistan" },
  { city: "Sialkot", country: "Pakistan" },
  // Bangladesh
  { city: "Dhaka", country: "Bangladesh" },
  { city: "Chittagong", country: "Bangladesh" },
  { city: "Sylhet", country: "Bangladesh" },
  { city: "Khulna", country: "Bangladesh" },
  { city: "Rajshahi", country: "Bangladesh" },
  { city: "Cox's Bazar", country: "Bangladesh" },
  // Sri Lanka
  { city: "Colombo", country: "Sri Lanka" },
  { city: "Kandy", country: "Sri Lanka" },
  { city: "Galle", country: "Sri Lanka" },
  { city: "Jaffna", country: "Sri Lanka" },
  { city: "Ella", country: "Sri Lanka" },
  { city: "Sigiriya", country: "Sri Lanka" },
  // Nepal
  { city: "Kathmandu", country: "Nepal" },
  { city: "Pokhara", country: "Nepal" },
  { city: "Lalitpur", country: "Nepal" },
  { city: "Chitwan", country: "Nepal" },
  { city: "Lumbini", country: "Nepal" },
  // Bhutan
  { city: "Thimphu", country: "Bhutan" },
  { city: "Paro", country: "Bhutan" },
  // Maldives
  { city: "Malé", country: "Maldives" },
  // Kazakhstan
  { city: "Almaty", country: "Kazakhstan" },
  { city: "Astana", country: "Kazakhstan" },
  { city: "Shymkent", country: "Kazakhstan" },
  { city: "Karaganda", country: "Kazakhstan" },
  { city: "Aktau", country: "Kazakhstan" },
  // Uzbekistan
  { city: "Tashkent", country: "Uzbekistan" },
  { city: "Samarkand", country: "Uzbekistan" },
  { city: "Bukhara", country: "Uzbekistan" },
  { city: "Khiva", country: "Uzbekistan" },
  { city: "Namangan", country: "Uzbekistan" },
  // Kyrgyzstan
  { city: "Bishkek", country: "Kyrgyzstan" },
  { city: "Osh", country: "Kyrgyzstan" },
  { city: "Karakol", country: "Kyrgyzstan" },
  // Tajikistan
  { city: "Dushanbe", country: "Tajikistan" },
  { city: "Khujand", country: "Tajikistan" },
  // Turkmenistan
  { city: "Ashgabat", country: "Turkmenistan" },
  { city: "Turkmenabat", country: "Turkmenistan" },
  // Afghanistan
  { city: "Kabul", country: "Afghanistan" },
  { city: "Herat", country: "Afghanistan" },
  { city: "Mazar-i-Sharif", country: "Afghanistan" },
  { city: "Kandahar", country: "Afghanistan" },

  // ============================================================
  // MIDDLE EAST
  // ============================================================
  // UAE
  { city: "Dubai", country: "UAE" },
  { city: "Abu Dhabi", country: "UAE" },
  { city: "Sharjah", country: "UAE" },
  { city: "Ajman", country: "UAE" },
  { city: "Ras Al Khaimah", country: "UAE" },
  { city: "Fujairah", country: "UAE" },
  { city: "Al Ain", country: "UAE" },
  // Saudi Arabia
  { city: "Riyadh", country: "Saudi Arabia" },
  { city: "Jeddah", country: "Saudi Arabia" },
  { city: "Mecca", country: "Saudi Arabia" },
  { city: "Medina", country: "Saudi Arabia" },
  { city: "Dammam", country: "Saudi Arabia" },
  { city: "Khobar", country: "Saudi Arabia" },
  { city: "Tabuk", country: "Saudi Arabia" },
  { city: "Abha", country: "Saudi Arabia" },
  { city: "Neom", country: "Saudi Arabia" },
  { city: "Taif", country: "Saudi Arabia" },
  // Qatar
  { city: "Doha", country: "Qatar" },
  { city: "Al Wakrah", country: "Qatar" },
  { city: "Lusail", country: "Qatar" },
  // Bahrain
  { city: "Manama", country: "Bahrain" },
  { city: "Muharraq", country: "Bahrain" },
  // Kuwait
  { city: "Kuwait City", country: "Kuwait" },
  { city: "Hawalli", country: "Kuwait" },
  { city: "Salmiya", country: "Kuwait" },
  // Oman
  { city: "Muscat", country: "Oman" },
  { city: "Salalah", country: "Oman" },
  { city: "Nizwa", country: "Oman" },
  { city: "Sohar", country: "Oman" },
  // Jordan
  { city: "Amman", country: "Jordan" },
  { city: "Aqaba", country: "Jordan" },
  { city: "Petra", country: "Jordan" },
  { city: "Irbid", country: "Jordan" },
  { city: "Dead Sea", country: "Jordan" },
  // Lebanon
  { city: "Beirut", country: "Lebanon" },
  { city: "Tripoli", country: "Lebanon" },
  { city: "Sidon", country: "Lebanon" },
  { city: "Byblos", country: "Lebanon" },
  // Israel
  { city: "Tel Aviv", country: "Israel" },
  { city: "Jerusalem", country: "Israel" },
  { city: "Haifa", country: "Israel" },
  { city: "Eilat", country: "Israel" },
  { city: "Be'er Sheva", country: "Israel" },
  { city: "Netanya", country: "Israel" },
  // Palestine
  { city: "Ramallah", country: "Palestine" },
  { city: "Bethlehem", country: "Palestine" },
  { city: "Gaza", country: "Palestine" },
  { city: "Nablus", country: "Palestine" },
  // Iraq
  { city: "Baghdad", country: "Iraq" },
  { city: "Erbil", country: "Iraq" },
  { city: "Basra", country: "Iraq" },
  { city: "Sulaymaniyah", country: "Iraq" },
  { city: "Mosul", country: "Iraq" },
  { city: "Najaf", country: "Iraq" },
  { city: "Karbala", country: "Iraq" },
  // Iran
  { city: "Tehran", country: "Iran" },
  { city: "Isfahan", country: "Iran" },
  { city: "Shiraz", country: "Iran" },
  { city: "Mashhad", country: "Iran" },
  { city: "Tabriz", country: "Iran" },
  { city: "Yazd", country: "Iran" },
  { city: "Kerman", country: "Iran" },
  { city: "Ahvaz", country: "Iran" },
  { city: "Rasht", country: "Iran" },
  // Syria
  { city: "Damascus", country: "Syria" },
  { city: "Aleppo", country: "Syria" },
  { city: "Homs", country: "Syria" },
  { city: "Latakia", country: "Syria" },
  // Yemen
  { city: "Sana'a", country: "Yemen" },
  { city: "Aden", country: "Yemen" },
  { city: "Taiz", country: "Yemen" },

  // ============================================================
  // AFRICA
  // ============================================================
  // Egypt
  { city: "Cairo", country: "Egypt" },
  { city: "Alexandria", country: "Egypt" },
  { city: "Luxor", country: "Egypt" },
  { city: "Giza", country: "Egypt" },
  { city: "Sharm El Sheikh", country: "Egypt" },
  { city: "Hurghada", country: "Egypt" },
  { city: "Aswan", country: "Egypt" },
  { city: "Port Said", country: "Egypt" },
  { city: "Dahab", country: "Egypt" },
  { city: "Ismailia", country: "Egypt" },
  // Morocco
  { city: "Casablanca", country: "Morocco" },
  { city: "Marrakech", country: "Morocco" },
  { city: "Rabat", country: "Morocco" },
  { city: "Fez", country: "Morocco" },
  { city: "Tangier", country: "Morocco" },
  { city: "Agadir", country: "Morocco" },
  { city: "Chefchaouen", country: "Morocco" },
  { city: "Essaouira", country: "Morocco" },
  { city: "Meknes", country: "Morocco" },
  { city: "Ouarzazate", country: "Morocco" },
  // Tunisia
  { city: "Tunis", country: "Tunisia" },
  { city: "Sousse", country: "Tunisia" },
  { city: "Sfax", country: "Tunisia" },
  { city: "Hammamet", country: "Tunisia" },
  { city: "Djerba", country: "Tunisia" },
  { city: "Monastir", country: "Tunisia" },
  // Algeria
  { city: "Algiers", country: "Algeria" },
  { city: "Oran", country: "Algeria" },
  { city: "Constantine", country: "Algeria" },
  { city: "Annaba", country: "Algeria" },
  { city: "Tlemcen", country: "Algeria" },
  { city: "Batna", country: "Algeria" },
  // Libya
  { city: "Tripoli", country: "Libya" },
  { city: "Benghazi", country: "Libya" },
  { city: "Misrata", country: "Libya" },
  // Nigeria
  { city: "Lagos", country: "Nigeria" },
  { city: "Abuja", country: "Nigeria" },
  { city: "Kano", country: "Nigeria" },
  { city: "Ibadan", country: "Nigeria" },
  { city: "Port Harcourt", country: "Nigeria" },
  { city: "Enugu", country: "Nigeria" },
  { city: "Benin City", country: "Nigeria" },
  { city: "Calabar", country: "Nigeria" },
  { city: "Kaduna", country: "Nigeria" },
  { city: "Jos", country: "Nigeria" },
  { city: "Ilorin", country: "Nigeria" },
  { city: "Abeokuta", country: "Nigeria" },
  // Ghana
  { city: "Accra", country: "Ghana" },
  { city: "Kumasi", country: "Ghana" },
  { city: "Tamale", country: "Ghana" },
  { city: "Takoradi", country: "Ghana" },
  { city: "Cape Coast", country: "Ghana" },
  // Senegal
  { city: "Dakar", country: "Senegal" },
  { city: "Saint-Louis", country: "Senegal" },
  { city: "Thiès", country: "Senegal" },
  { city: "Ziguinchor", country: "Senegal" },
  // Ivory Coast
  { city: "Abidjan", country: "Ivory Coast" },
  { city: "Yamoussoukro", country: "Ivory Coast" },
  { city: "Bouaké", country: "Ivory Coast" },
  { city: "San-Pédro", country: "Ivory Coast" },
  // Mali
  { city: "Bamako", country: "Mali" },
  { city: "Timbuktu", country: "Mali" },
  { city: "Sikasso", country: "Mali" },
  // Burkina Faso
  { city: "Ouagadougou", country: "Burkina Faso" },
  { city: "Bobo-Dioulasso", country: "Burkina Faso" },
  // Togo
  { city: "Lomé", country: "Togo" },
  { city: "Sokodé", country: "Togo" },
  // Benin
  { city: "Cotonou", country: "Benin" },
  { city: "Porto-Novo", country: "Benin" },
  { city: "Parakou", country: "Benin" },
  // Niger
  { city: "Niamey", country: "Niger" },
  { city: "Zinder", country: "Niger" },
  { city: "Maradi", country: "Niger" },
  // Guinea
  { city: "Conakry", country: "Guinea" },
  { city: "Nzérékoré", country: "Guinea" },
  // Sierra Leone
  { city: "Freetown", country: "Sierra Leone" },
  { city: "Bo", country: "Sierra Leone" },
  // Liberia
  { city: "Monrovia", country: "Liberia" },
  // Mauritania
  { city: "Nouakchott", country: "Mauritania" },
  { city: "Nouadhibou", country: "Mauritania" },
  // Gambia
  { city: "Banjul", country: "Gambia" },
  { city: "Serrekunda", country: "Gambia" },
  // Guinea-Bissau
  { city: "Bissau", country: "Guinea-Bissau" },
  // Cape Verde
  { city: "Praia", country: "Cape Verde" },
  { city: "Mindelo", country: "Cape Verde" },
  { city: "Sal", country: "Cape Verde" },
  // Kenya
  { city: "Nairobi", country: "Kenya" },
  { city: "Mombasa", country: "Kenya" },
  { city: "Kisumu", country: "Kenya" },
  { city: "Nakuru", country: "Kenya" },
  { city: "Eldoret", country: "Kenya" },
  { city: "Lamu", country: "Kenya" },
  { city: "Malindi", country: "Kenya" },
  { city: "Naivasha", country: "Kenya" },
  // Tanzania
  { city: "Dar es Salaam", country: "Tanzania" },
  { city: "Zanzibar", country: "Tanzania" },
  { city: "Arusha", country: "Tanzania" },
  { city: "Dodoma", country: "Tanzania" },
  { city: "Mwanza", country: "Tanzania" },
  { city: "Moshi", country: "Tanzania" },
  // Ethiopia
  { city: "Addis Ababa", country: "Ethiopia" },
  { city: "Dire Dawa", country: "Ethiopia" },
  { city: "Adama", country: "Ethiopia" },
  { city: "Gondar", country: "Ethiopia" },
  { city: "Bahir Dar", country: "Ethiopia" },
  { city: "Lalibela", country: "Ethiopia" },
  { city: "Hawassa", country: "Ethiopia" },
  // Uganda
  { city: "Kampala", country: "Uganda" },
  { city: "Entebbe", country: "Uganda" },
  { city: "Jinja", country: "Uganda" },
  { city: "Mbarara", country: "Uganda" },
  { city: "Gulu", country: "Uganda" },
  // Rwanda
  { city: "Kigali", country: "Rwanda" },
  { city: "Butare", country: "Rwanda" },
  { city: "Gisenyi", country: "Rwanda" },
  // Burundi
  { city: "Bujumbura", country: "Burundi" },
  { city: "Gitega", country: "Burundi" },
  // Somalia
  { city: "Mogadishu", country: "Somalia" },
  { city: "Hargeisa", country: "Somalia" },
  { city: "Berbera", country: "Somalia" },
  // Djibouti
  { city: "Djibouti", country: "Djibouti" },
  // Eritrea
  { city: "Asmara", country: "Eritrea" },
  { city: "Massawa", country: "Eritrea" },
  // Madagascar
  { city: "Antananarivo", country: "Madagascar" },
  { city: "Toamasina", country: "Madagascar" },
  { city: "Nosy Be", country: "Madagascar" },
  { city: "Antsirabe", country: "Madagascar" },
  // Mauritius
  { city: "Port Louis", country: "Mauritius" },
  { city: "Grand Baie", country: "Mauritius" },
  { city: "Flic en Flac", country: "Mauritius" },
  // Seychelles
  { city: "Victoria", country: "Seychelles" },
  { city: "La Digue", country: "Seychelles" },
  // DR Congo
  { city: "Kinshasa", country: "DR Congo" },
  { city: "Lubumbashi", country: "DR Congo" },
  { city: "Goma", country: "DR Congo" },
  { city: "Mbuji-Mayi", country: "DR Congo" },
  { city: "Kisangani", country: "DR Congo" },
  // Republic of Congo
  { city: "Brazzaville", country: "Republic of Congo" },
  { city: "Pointe-Noire", country: "Republic of Congo" },
  // Cameroon
  { city: "Douala", country: "Cameroon" },
  { city: "Yaoundé", country: "Cameroon" },
  { city: "Bamenda", country: "Cameroon" },
  { city: "Bafoussam", country: "Cameroon" },
  { city: "Garoua", country: "Cameroon" },
  { city: "Limbe", country: "Cameroon" },
  // Gabon
  { city: "Libreville", country: "Gabon" },
  { city: "Port-Gentil", country: "Gabon" },
  { city: "Franceville", country: "Gabon" },
  // Central African Republic
  { city: "Bangui", country: "Central African Republic" },
  // Chad
  { city: "N'Djamena", country: "Chad" },
  { city: "Moundou", country: "Chad" },
  // Equatorial Guinea
  { city: "Malabo", country: "Equatorial Guinea" },
  { city: "Bata", country: "Equatorial Guinea" },
  // São Tomé & Príncipe
  { city: "São Tomé", country: "São Tomé & Príncipe" },
  // South Africa
  { city: "Cape Town", country: "South Africa" },
  { city: "Johannesburg", country: "South Africa" },
  { city: "Durban", country: "South Africa" },
  { city: "Pretoria", country: "South Africa" },
  { city: "Port Elizabeth", country: "South Africa" },
  { city: "Bloemfontein", country: "South Africa" },
  { city: "Stellenbosch", country: "South Africa" },
  { city: "East London", country: "South Africa" },
  { city: "Pietermaritzburg", country: "South Africa" },
  { city: "Kimberley", country: "South Africa" },
  { city: "Knysna", country: "South Africa" },
  { city: "Soweto", country: "South Africa" },
  // Namibia
  { city: "Windhoek", country: "Namibia" },
  { city: "Walvis Bay", country: "Namibia" },
  { city: "Swakopmund", country: "Namibia" },
  // Botswana
  { city: "Gaborone", country: "Botswana" },
  { city: "Francistown", country: "Botswana" },
  { city: "Maun", country: "Botswana" },
  { city: "Kasane", country: "Botswana" },
  // Zimbabwe
  { city: "Harare", country: "Zimbabwe" },
  { city: "Bulawayo", country: "Zimbabwe" },
  { city: "Victoria Falls", country: "Zimbabwe" },
  { city: "Mutare", country: "Zimbabwe" },
  // Zambia
  { city: "Lusaka", country: "Zambia" },
  { city: "Livingstone", country: "Zambia" },
  { city: "Ndola", country: "Zambia" },
  { city: "Kitwe", country: "Zambia" },
  // Malawi
  { city: "Lilongwe", country: "Malawi" },
  { city: "Blantyre", country: "Malawi" },
  { city: "Mzuzu", country: "Malawi" },
  // Mozambique
  { city: "Maputo", country: "Mozambique" },
  { city: "Beira", country: "Mozambique" },
  { city: "Nampula", country: "Mozambique" },
  { city: "Inhambane", country: "Mozambique" },
  { city: "Vilankulo", country: "Mozambique" },
  // Angola
  { city: "Luanda", country: "Angola" },
  { city: "Benguela", country: "Angola" },
  { city: "Lobito", country: "Angola" },
  { city: "Huambo", country: "Angola" },
  { city: "Lubango", country: "Angola" },
  // Eswatini
  { city: "Mbabane", country: "Eswatini" },
  { city: "Manzini", country: "Eswatini" },
  // Lesotho
  { city: "Maseru", country: "Lesotho" },
  // Comoros
  { city: "Moroni", country: "Comoros" },
  // Sudan
  { city: "Khartoum", country: "Sudan" },
  { city: "Omdurman", country: "Sudan" },
  { city: "Port Sudan", country: "Sudan" },
  // South Sudan
  { city: "Juba", country: "South Sudan" },

  // ============================================================
  // OCEANIA
  // ============================================================
  // Australia
  { city: "Sydney", country: "Australia" },
  { city: "Melbourne", country: "Australia" },
  { city: "Brisbane", country: "Australia" },
  { city: "Perth", country: "Australia" },
  { city: "Adelaide", country: "Australia" },
  { city: "Gold Coast", country: "Australia" },
  { city: "Canberra", country: "Australia" },
  { city: "Hobart", country: "Australia" },
  { city: "Darwin", country: "Australia" },
  { city: "Cairns", country: "Australia" },
  { city: "Newcastle", country: "Australia" },
  { city: "Wollongong", country: "Australia" },
  { city: "Townsville", country: "Australia" },
  { city: "Geelong", country: "Australia" },
  { city: "Sunshine Coast", country: "Australia" },
  { city: "Alice Springs", country: "Australia" },
  { city: "Byron Bay", country: "Australia" },
  // New Zealand
  { city: "Auckland", country: "New Zealand" },
  { city: "Wellington", country: "New Zealand" },
  { city: "Queenstown", country: "New Zealand" },
  { city: "Christchurch", country: "New Zealand" },
  { city: "Hamilton", country: "New Zealand" },
  { city: "Tauranga", country: "New Zealand" },
  { city: "Rotorua", country: "New Zealand" },
  { city: "Dunedin", country: "New Zealand" },
  { city: "Napier", country: "New Zealand" },
  { city: "Nelson", country: "New Zealand" },
  // Pacific Islands
  { city: "Suva", country: "Fiji" },
  { city: "Nadi", country: "Fiji" },
  { city: "Lautoka", country: "Fiji" },
  { city: "Apia", country: "Samoa" },
  { city: "Pago Pago", country: "American Samoa" },
  { city: "Nuku'alofa", country: "Tonga" },
  { city: "Port Moresby", country: "Papua New Guinea" },
  { city: "Lae", country: "Papua New Guinea" },
  { city: "Honiara", country: "Solomon Islands" },
  { city: "Port Vila", country: "Vanuatu" },
  { city: "Tarawa", country: "Kiribati" },
  { city: "Papeete", country: "French Polynesia" },
  { city: "Bora Bora", country: "French Polynesia" },
  { city: "Nouméa", country: "New Caledonia" },
  { city: "Majuro", country: "Marshall Islands" },
  { city: "Koror", country: "Palau" },
  { city: "Palikir", country: "Micronesia" },
  { city: "Funafuti", country: "Tuvalu" },
  { city: "Yaren", country: "Nauru" },
  { city: "Alofi", country: "Niue" },
  { city: "Rarotonga", country: "Cook Islands" },
  { city: "Mata-Utu", country: "Wallis & Futuna" },
  { city: "Guam", country: "Guam" },
  { city: "Saipan", country: "Northern Mariana Islands" },
];

// Popular Albanian diaspora cities — shown by default, coords embedded to skip geocoding
type PopularCity = { city: string; country: string; lat: number; lon: number; emoji: string };

const POPULAR_DESTINATIONS: PopularCity[] = [
  { city: "Tirana", country: "Albania", lat: 41.3275, lon: 19.8187, emoji: "🇦🇱" },
  { city: "Pristina", country: "Kosovo", lat: 42.6629, lon: 21.1655, emoji: "🇽🇰" },
  { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, emoji: "🇬🇧" },
  { city: "Zurich", country: "Switzerland", lat: 47.3769, lon: 8.5417, emoji: "🇨🇭" },
  { city: "Munich", country: "Germany", lat: 48.1351, lon: 11.582, emoji: "🇩🇪" },
  { city: "Berlin", country: "Germany", lat: 52.52, lon: 13.405, emoji: "🇩🇪" },
  { city: "Vienna", country: "Austria", lat: 48.2082, lon: 16.3738, emoji: "🇦🇹" },
  { city: "New York", country: "United States", lat: 40.7128, lon: -74.006, emoji: "🇺🇸" },
  { city: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041, emoji: "🇳🇱" },
  { city: "Brussels", country: "Belgium", lat: 50.8503, lon: 4.3517, emoji: "🇧🇪" },
  { city: "Stockholm", country: "Sweden", lat: 59.3293, lon: 18.0686, emoji: "🇸🇪" },
  { city: "Geneva", country: "Switzerland", lat: 46.2044, lon: 6.1432, emoji: "🇨🇭" },
];

// Quick coordinate lookup — avoids Nominatim API call for popular cities
const CITY_COORDS: Record<string, { lat: number; lon: number }> = Object.fromEntries(
  POPULAR_DESTINATIONS.map((p) => [`${p.city}|${p.country}`, { lat: p.lat, lon: p.lon }])
);

interface TravelModeProps {
  userId: string;
  isPremium: boolean;
  travelModeActive: boolean;
  travelCity: string | null;
  onTravelModeChange: () => void;
  triggerClassName?: string;
}

export const TravelMode = ({
  userId,
  isPremium,
  travelModeActive,
  travelCity,
  onTravelModeChange,
  triggerClassName,
}: TravelModeProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  // When true, show city picker even while travel mode is active (Change City flow)
  const [isChangingCity, setIsChangingCity] = useState(false);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return CITIES.filter(
      (c) => c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [searchQuery]);

  const resetPicker = () => {
    setSearchQuery("");
    setCity("");
    setCountry("");
    setIsChangingCity(false);
  };

  const handleSelectCity = (entry: { city: string; country: string }) => {
    setCity(entry.city);
    setCountry(entry.country);
    setSearchQuery("");
  };

  const handleActivateTravelMode = async () => {
    if (!city || !country) {
      toast.error("Please select a destination");
      return;
    }

    setLoading(true);
    try {
      let lat: number, lon: number, display_name: string;

      // Use embedded coordinates for popular cities — no API round-trip needed
      const cached = CITY_COORDS[`${city}|${country}`];
      if (cached) {
        lat = cached.lat;
        lon = cached.lon;
        display_name = `${city}, ${country}`;
      } else {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json&limit=1`
        );
        const geocodeData = await geocodeResponse.json();

        if (!geocodeData || geocodeData.length === 0) {
          toast.error("Could not find that location. Please try again.");
          setLoading(false);
          return;
        }

        lat = parseFloat(geocodeData[0].lat);
        lon = parseFloat(geocodeData[0].lon);
        display_name = geocodeData[0].display_name;
      }

      const { data, error } = (await supabase.rpc("activate_travel_mode", {
        p_user_id: userId,
        p_location: display_name,
        p_city: city,
        p_country: country,
        p_latitude: lat,
        p_longitude: lon,
      })) as { data: { success: boolean; error?: string } | null; error: Error | null };

      if (error) throw error;

      if (data?.success) {
        toast.success(`✈️ Now exploring ${city}!`);
        setOpen(false);
        resetPicker();
        onTravelModeChange();
      } else {
        toast.error(data?.error || "Failed to activate Travel Mode");
      }
    } catch (err) {
      logger.error("Error activating travel mode:", err);
      toast.error("Failed to activate Travel Mode");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateTravelMode = async () => {
    setLoading(true);
    try {
      const { data, error } = (await supabase.rpc("deactivate_travel_mode", {
        p_user_id: userId,
      })) as { data: { success: boolean } | null; error: Error | null };

      if (error) throw error;

      if (data?.success) {
        toast.success("Back to your home location");
        setOpen(false);
        resetPicker();
        onTravelModeChange();
      }
    } catch (err) {
      logger.error("Error deactivating travel mode:", err);
      toast.error("Failed to deactivate Travel Mode");
    } finally {
      setLoading(false);
    }
  };

  // City picker — shared between activation and "change city" flows
  const cityPickerContent = (
    <>
      <DialogHeader>
        <DialogTitle>
          ✈️ {isChangingCity ? "Change Destination" : "Where are you going?"}
        </DialogTitle>
        <DialogDescription>
          {isChangingCity
            ? `Currently in ${travelCity}. Pick a new city to switch.`
            : "Pick a city to start seeing matches there."}
        </DialogDescription>
      </DialogHeader>

      {city && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-medium text-sm">
            {city}, {country}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto"
            onClick={() => {
              setCity("");
              setCountry("");
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search any city or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      <ScrollArea className="flex-1 max-h-[38vh] border rounded-lg">
        <div className="p-1">
          {searchQuery.trim() === "" ? (
            <>
              <p className="text-xs text-muted-foreground font-medium px-3 pt-2 pb-1 uppercase tracking-wide">
                Popular Albanian destinations
              </p>
              {POPULAR_DESTINATIONS.map((entry) => (
                <button
                  key={`pop-${entry.city}`}
                  type="button"
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm hover:bg-primary/10 transition-colors flex items-center gap-3 ${
                    city === entry.city && country === entry.country
                      ? "bg-primary/15 font-medium"
                      : ""
                  }`}
                  onClick={() => handleSelectCity(entry)}
                >
                  <span className="text-base w-5 text-center">{entry.emoji}</span>
                  <span className="flex-1">{entry.city}</span>
                  <span className="text-xs text-muted-foreground">{entry.country}</span>
                </button>
              ))}
            </>
          ) : filteredCities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No cities found</p>
          ) : (
            filteredCities.map((entry) => (
              <button
                key={`${entry.city}-${entry.country}`}
                type="button"
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm hover:bg-primary/10 transition-colors flex items-center justify-between ${
                  city === entry.city && country === entry.country
                    ? "bg-primary/15 font-medium"
                    : ""
                }`}
                onClick={() => handleSelectCity(entry)}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  {entry.city}
                </span>
                <span className="text-xs text-muted-foreground">{entry.country}</span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        {isChangingCity && (
          <Button variant="outline" className="flex-1" onClick={() => setIsChangingCity(false)}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleActivateTravelMode}
          disabled={loading || !city || !country}
          className="flex-1"
        >
          {loading ? "Activating..." : city ? `Fly to ${city} ✈️` : "Select a city"}
        </Button>
      </div>
    </>
  );

  if (!isPremium) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className={triggerClassName ?? "gap-2"}>
            <Plane className="h-4 w-4 mr-2" />
            Travel Mode
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✈️ Travel Mode</DialogTitle>
            <DialogDescription>
              Explore matches in any city before you even arrive. Upgrade to Premium to unlock
              Travel Mode.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90">
            Upgrade to Premium ✨
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetPicker();
      }}
    >
      <DialogTrigger asChild>
        {travelModeActive ? (
          <Button variant="ghost" className={`${triggerClassName ?? "gap-2"} text-primary`}>
            <Plane className="h-4 w-4 mr-2 animate-pulse" />
            <span className="truncate">{travelCity ?? "Traveling"}</span>
            <span className="ml-1 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              On
            </span>
          </Button>
        ) : (
          <Button variant="ghost" className={triggerClassName ?? "gap-2"}>
            <Plane className="h-4 w-4 mr-2" />
            Travel Mode
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] flex flex-col">
        {travelModeActive && !isChangingCity ? (
          <>
            <DialogHeader>
              <DialogTitle>✈️ Travel Mode Active</DialogTitle>
              <DialogDescription>
                You're exploring {travelCity}. Profiles from this city are shown to you.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 flex items-center gap-3">
              <div className="bg-primary/15 rounded-full p-3 flex-shrink-0">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{travelCity}</p>
                <p className="text-xs text-muted-foreground">Active destination</p>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleDeactivateTravelMode}
                disabled={loading}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Go Home
              </Button>
              <Button className="gap-2" onClick={() => setIsChangingCity(true)} disabled={loading}>
                <MapPin className="h-4 w-4" />
                Change City
              </Button>
            </div>
          </>
        ) : (
          cityPickerContent
        )}
      </DialogContent>
    </Dialog>
  );
};
