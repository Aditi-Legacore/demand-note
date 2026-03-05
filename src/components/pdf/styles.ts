import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2pt solid #10b981',
  },
  logoImage: {
    width: 150,
    height: 30,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    color: '#10b981',
    marginBottom: 30,
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#10b981',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1pt solid #e5e7eb',
    fontFamily: 'Helvetica-Bold',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
    fontSize: 9,
  },
  infoItemFull: {
    width: '100%',
    marginBottom: 8,
    fontSize: 9,
  },
  label: {
    fontFamily: 'Helvetica-Bold',
  },
  subsection: {
    marginTop: 10,
    marginLeft: 15,
    paddingLeft: 10,
    borderLeft: '2pt solid #10b981',
  },
  subsectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    opacity: 0.5,
  },
});
